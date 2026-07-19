#!/usr/bin/env python3
"""
Comprehensive Selenium checks for LabCAS UI deployments.

The suite is intentionally noninteractive:
  - Public checks run without credentials.
  - Auth-only checks run when --username/--password or LABCAS_USERNAME/LABCAS_PASSWORD
    are provided.
  - JSON and Markdown reports are written to reports/ by default.
"""

import argparse
import json
import os
import ssl
import sys
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urlencode, urljoin
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from selenium import webdriver
from selenium.common.exceptions import (
    JavascriptException,
    NoSuchElementException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


DEFAULT_BASE_URL = "https://labcas-dev.jpl.nasa.gov"
DEFAULT_TIMEOUT = 45

RDF_TEST_COLLECTION = "Reproducibility_of_miRNA_Measurements"
RDF_EXPECTED_SHORTNAME = "Interlab Study of miRNA Measurement"

DEFAULT_HIERARCHY_COLLECTIONS = ("Prostate_MRI", "Lung_Team_Project_2")
DEFAULT_HIERARCHY_TAGS = ("BlindedSiteID", "eventID")

PDAC_COLLECTION = "Pre-diagnostic_PDAC_Images"
PDAC_EXPECTED_FACETS = (
    "AnnotationStatus",
    "DICOMAnnotationType",
    "InstitutionID",
    "Institution",
    "SubmittingSiteID",
    "Discipline",
)

NESTED_DATASET_CANDIDATES = (
    "Pre-diagnostic_PDAC_Images/UPMC/Original",
    "Pre-diagnostic_PDAC_Images/UPMC/Annotated",
    "Lung_Team_Project_2/LTP2-Site6",
    "Prostate_MRI/Images_Site_c41ux70b3h6cow/8882525",
)
NESTED_DATASET_SEARCH_COLLECTIONS = (
    PDAC_COLLECTION,
    "Lung_Team_Project_2",
    "Prostate_MRI",
)
OHIF_RENDER_DATASET = os.getenv(
    "LABCAS_OHIF_RENDER_DATASET",
    "Automated_System_For_Breast_Cancer_Biomarker_Analysis/C0001/MASK",
)


class SkipTest(Exception):
    pass


@dataclass
class StepResult:
    name: str
    status: str
    duration_s: float
    detail: str = ""
    screenshot: str = ""
    console_errors: list = field(default_factory=list)


def now_stamp():
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def log(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)


def build_driver(headless=True):
    options = Options()
    options.add_argument("--incognito")
    options.add_argument("--window-size=1440,1100")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.add_argument("--ignore-certificate-errors")
    options.page_load_strategy = "eager"
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    if headless:
        options.add_argument("--headless=new")
    driver = webdriver.Chrome(options=options)
    driver.set_script_timeout(60)
    driver.set_page_load_timeout(60)
    return driver


def wait_ready(driver, timeout):
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script("return document.readyState") in ("interactive", "complete")
    )


def wait_js(driver, expression, timeout, message=None):
    def _check(d):
        return d.execute_script(f"return Boolean({expression});")

    try:
        return WebDriverWait(driver, timeout).until(_check)
    except TimeoutException as exc:
        raise AssertionError(message or f"Timed out waiting for JS: {expression}") from exc


def wait_text(driver, text, timeout):
    xpath = f"//*[contains(normalize-space(.), {json.dumps(text)})]"
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, xpath))
    )


def wait_for_any(driver, checks, timeout, poll_interval=0.5):
    end = time.time() + timeout
    last_exc = None
    while time.time() < end:
        for check in checks:
            try:
                result = check()
                if result:
                    return result
            except WebDriverException as exc:
                if "invalid session id" in (str(exc) or "").lower():
                    raise
                last_exc = exc
            except Exception as exc:
                last_exc = exc
        time.sleep(poll_interval)
    if last_exc:
        raise TimeoutException(str(last_exc))
    raise TimeoutException("Timed out waiting for condition.")


def visible_text(driver):
    try:
        return driver.find_element(By.TAG_NAME, "body").text
    except NoSuchElementException:
        return ""


def safe_json_loads(value, default=None):
    try:
        return json.loads(value)
    except Exception:
        return default


def build_dataset_file_query(dataset_id):
    safe = dataset_id.replace("\\", "\\\\").replace('"', '\\"')
    prefix = safe + "/"
    return f'DatasetId:"{safe}" OR _query_:"{{!prefix f=DatasetId}}{prefix}"'


class LabcasSuite:
    def __init__(self, args):
        self.args = args
        self.base_url = args.base_url.rstrip("/")
        self.timeout = args.timeout
        self.report_dir = Path(args.report_dir)
        self.artifact_dir = self.report_dir / f"artifacts-{now_stamp()}"
        self.results = []
        self.driver = None
        self.authenticated = False
        self.auth_token = ""
        self.selected_nested_dataset = None
        ensure_dir(self.report_dir)
        ensure_dir(self.artifact_dir)

    def url(self, path):
        return urljoin(self.base_url + "/", path.lstrip("/"))

    def start(self):
        self.driver = build_driver(headless=self.args.headless)

    def stop(self):
        if self.driver:
            self.driver.quit()

    def browser_console_issues(self):
        issues = []
        try:
            for item in self.driver.get_log("browser"):
                level = item.get("level", "")
                message = item.get("message", "")
                if level in ("SEVERE", "WARNING"):
                    if "favicon.ico" in message:
                        continue
                    if "Failed to load resource" in message and "ERR_BLOCKED_BY_CLIENT" in message:
                        continue
                    issues.append({"level": level, "message": message[:1000]})
        except Exception:
            pass
        return issues

    def screenshot(self, name):
        safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in name)[:90]
        path = self.artifact_dir / f"{safe}.png"
        try:
            self.driver.save_screenshot(str(path))
            return str(path)
        except Exception:
            return ""

    def ohif_frame_diagnostics(self):
        """Capture useful OHIF error state while already switched into the iframe."""
        try:
            initial = self.driver.execute_script(
                """
                const text = (el) => (el && (el.innerText || el.textContent || '') || '').trim();
                const compact = (value, limit) => String(value || '').replace(/\\s+/g, ' ').trim().slice(0, limit);
                const bodyText = text(document.body);
                const buttons = Array.from(document.querySelectorAll('button,[role="button"]'));
                const showDetails = buttons.find((button) => /show details/i.test(text(button) || button.getAttribute('aria-label') || ''));
                const canvases = Array.from(document.querySelectorAll('canvas')).map((canvas) => {
                    const rect = canvas.getBoundingClientRect();
                    return {
                        width: canvas.width,
                        height: canvas.height,
                        rectWidth: Math.round(rect.width),
                        rectHeight: Math.round(rect.height)
                    };
                });
                if (showDetails) {
                    showDetails.click();
                }
                return {
                    href: window.location.href,
                    readyState: document.readyState,
                    title: document.title || '',
                    bodySnippet: compact(bodyText, 900),
                    showDetailsFound: Boolean(showDetails),
                    showDetailsText: showDetails ? compact(text(showDetails), 200) : '',
                    buttons: buttons.map((button) => compact(text(button) || button.getAttribute('aria-label') || '', 80)).filter(Boolean).slice(0, 20),
                    canvasCount: canvases.length,
                    canvases,
                    rootChildren: document.querySelector('#root') ? document.querySelector('#root').children.length : -1,
                    viewportCount: document.querySelectorAll("[data-cy='viewport-container'], .viewport-element, .ViewportOverlay, .viewport-container").length
                };
                """
            )
            time.sleep(0.25)
            expanded = self.driver.execute_script(
                """
                const text = (el) => (el && (el.innerText || el.textContent || '') || '').trim();
                const compact = (value, limit) => String(value || '').replace(/\\s+/g, ' ').trim().slice(0, limit);
                const selector = [
                    '[role="alert"]',
                    '[role="dialog"]',
                    'pre',
                    'code',
                    'textarea',
                    'details',
                    '.MuiAlert-root',
                    '.MuiDialog-root',
                    '.MuiPaper-root',
                    '.MuiCollapse-root'
                ].join(',');
                const detailNodes = Array.from(document.querySelectorAll(selector))
                    .map((node) => compact(text(node), 1200))
                    .filter(Boolean);
                return {
                    bodySnippet: compact(text(document.body), 1800),
                    detailNodes: Array.from(new Set(detailNodes)).slice(0, 12)
                };
                """
            )
            initial["afterShowDetails"] = expanded
            return initial
        except Exception as exc:
            return {"diagnosticError": f"{type(exc).__name__}: {exc}"}

    def safe_click(self, element):
        try:
            element.click()
        except WebDriverException:
            self.driver.execute_script("arguments[0].click();", element)

    def run_step(self, name, func):
        log(f"START {name}")
        start = time.time()
        status = "PASS"
        detail = ""
        screenshot = ""
        try:
            detail = func() or ""
        except SkipTest as exc:
            status = "SKIP"
            detail = str(exc)
        except Exception as exc:
            status = "FAIL"
            detail = f"{type(exc).__name__}: {exc}"
            screenshot = self.screenshot(name)
            if self.args.show_traceback:
                detail += "\n" + traceback.format_exc()
        duration = time.time() - start
        console_issues = self.browser_console_issues()
        self.results.append(
            StepResult(
                name=name,
                status=status,
                duration_s=round(duration, 3),
                detail=detail,
                screenshot=screenshot,
                console_errors=console_issues,
            )
        )
        log(f"{status} {name} ({duration:.1f}s){': ' + detail if detail else ''}")
        if status == "FAIL" and self.args.fail_fast:
            raise SystemExit(1)

    def browser_fetch_json(self, path_or_url, timeout=15000):
        url = path_or_url
        if not path_or_url.startswith("http"):
            url = self.url(path_or_url)
        script = """
            const url = arguments[0];
            const timeoutMs = arguments[1];
            const done = arguments[arguments.length - 1];
            const controller = new AbortController();
            let finished = false;
            const finish = payload => {
              if (finished) return;
              finished = true;
              clearTimeout(timeout);
              done(payload);
            };
            const timeout = setTimeout(() => {
              try { controller.abort(); } catch (e) {}
              finish({ok: false, status: 0, error: "client timeout", url});
            }, timeoutMs);
            fetch(url, {credentials: "include", signal: controller.signal})
              .then(async response => {
                const text = await response.text();
                let body = null;
                try { body = JSON.parse(text); } catch (e) { body = text; }
                finish({ok: response.ok, status: response.status, url: response.url, body});
              })
              .catch(error => {
                finish({ok: false, status: 0, error: String(error), url});
              });
        """
        return self.driver.execute_async_script(script, url, timeout)

    def direct_fetch_json(self, path_or_url, timeout=45):
        url = path_or_url if path_or_url.startswith("http") else self.url(path_or_url)
        headers = {"Accept": "application/json"}
        if self.auth_token:
            headers["Authorization"] = "Bearer " + self.auth_token
        request = Request(url, headers=headers)
        context = ssl._create_unverified_context()
        try:
            with urlopen(request, timeout=timeout, context=context) as response:
                text = response.read().decode("utf-8", errors="replace")
                try:
                    body = json.loads(text)
                except json.JSONDecodeError:
                    body = text
                return {"ok": 200 <= response.status < 300, "status": response.status, "url": url, "body": body}
        except HTTPError as exc:
            text = exc.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(text)
            except json.JSONDecodeError:
                body = text
            return {"ok": False, "status": exc.code, "url": url, "body": body, "error": exc.reason}
        except Exception as exc:
            return {"ok": False, "status": 0, "url": url, "error": f"{type(exc).__name__}: {exc}"}

    def should_direct_fetch(self, path_or_url):
        url = path_or_url if path_or_url.startswith("http") else self.url(path_or_url)
        return "/data-access-api/" in url or "/labcas-ui/assets/conf/" in url

    def assert_fetch_ok(self, path_or_url):
        result = self.direct_fetch_json(path_or_url) if self.should_direct_fetch(path_or_url) else self.browser_fetch_json(path_or_url)
        if not result.get("ok") and self.should_direct_fetch(path_or_url):
            browser_result = self.browser_fetch_json(path_or_url)
            if browser_result.get("ok"):
                result = browser_result
            else:
                result["browser_error"] = browser_result.get("error")
                result["browser_status"] = browser_result.get("status")
        if not result.get("ok"):
            raise AssertionError(
                f"Fetch failed status={result.get('status')} error={result.get('error')} "
                f"browser_status={result.get('browser_status')} browser_error={result.get('browser_error')} "
                f"url={result.get('url')}"
            )
        return result.get("body")

    def http_status(self, path_or_url, timeout=15):
        url = path_or_url if path_or_url.startswith("http") else self.url(path_or_url)
        request = Request(url, headers={"Accept": "application/json"})
        context = ssl._create_unverified_context()
        try:
            with urlopen(request, timeout=timeout, context=context) as response:
                return response.status, response.read().decode("utf-8", errors="replace")
        except HTTPError as exc:
            return exc.code, exc.read().decode("utf-8", errors="replace")
        except URLError as exc:
            raise AssertionError(f"HTTP request failed before status: {exc}") from exc

    def load_environment(self):
        self.driver.get(self.url("/labcas-ui/index.html"))
        wait_ready(self.driver, self.timeout)
        body = self.assert_fetch_ok("/labcas-ui/assets/conf/environment.cfg?selenium=1")
        if not isinstance(body, dict):
            raise AssertionError("environment.cfg did not parse as JSON")
        return body

    def test_environment_config(self):
        cfg = self.load_environment()
        required = [
            "environment_name",
            "environment",
            "environment_url",
            "collection_default_virtual_hierarchy",
            "cde_rdf_protocols_api",
        ]
        missing = [key for key in required if key not in cfg]
        if missing:
            raise AssertionError(f"Missing config keys: {', '.join(missing)}")
        defaults = cfg.get("collection_default_virtual_hierarchy") or {}
        for collection_id in DEFAULT_HIERARCHY_COLLECTIONS:
            if defaults.get(collection_id) != list(DEFAULT_HIERARCHY_TAGS):
                raise AssertionError(
                    f"{collection_id} default hierarchy is {defaults.get(collection_id)!r}"
                )
        return f"environment={cfg.get('environment')} defaults={defaults}"

    def test_landing_page(self):
        self.driver.get(self.url("/labcas-ui/index.html"))
        wait_ready(self.driver, self.timeout)
        wait_text(self.driver, "Labcas 3.0", self.timeout)
        wait_js(
            self.driver,
            "document.querySelector('#collections_len') && document.querySelector('#datasets_len')",
            self.timeout,
            "Landing page counters did not render",
        )
        banner = self.driver.execute_script(
            "return (document.querySelector('#dev-env-banner') || {}).textContent || ''"
        )
        return f"dev_banner={banner or '(none)'}"

    def test_public_collection_search_api(self):
        self.driver.get(self.url("/labcas-ui/s/index.html?search=*"))
        wait_ready(self.driver, self.timeout)
        body = self.assert_fetch_ok(
            "/data-access-api/collections/select?q=*:*&wt=json&rows=5&fl=id,CollectionName"
        )
        num_found = body.get("response", {}).get("numFound", 0)
        docs = body.get("response", {}).get("docs", [])
        if num_found <= 0 or not docs:
            raise AssertionError("No public collection metadata returned")
        return f"collections={num_found}, first={docs[0].get('id')}"

    def test_collection_details_and_rdf(self):
        self.driver.get(
            self.url(f"/labcas-ui/c/index.html?collection_id={quote(RDF_TEST_COLLECTION)}")
        )
        wait_ready(self.driver, self.timeout)
        wait_text(self.driver, "Collection Details", self.timeout)
        wait_text(self.driver, RDF_EXPECTED_SHORTNAME, self.timeout)
        body = visible_text(self.driver)
        if "Protocol ID" not in body and "ProtocolId" not in body:
            raise AssertionError("Collection details did not show protocol id")
        logs = self.driver.get_log("browser")
        joined_logs = "\n".join(item.get("message", "") for item in logs)
        if "LabCAS protocol metadata: using CDE RDF" not in joined_logs:
            raise AssertionError("RDF protocol metadata success was not seen in browser logs")
        return f"rdf_shortname={RDF_EXPECTED_SHORTNAME}"

    def test_guest_file_access_is_blocked(self):
        path = (
            "/data-access-api/files/select?"
            + urlencode(
                {
                    "q": "CollectionId:Prostate_MRI",
                    "wt": "json",
                    "rows": "0",
                }
            )
        )
        status, body = self.http_status(path)
        if status not in (401, 403):
            raise AssertionError(f"Expected 401/403, got status={status}, body={body[:200]}")
        return f"status={status}"

    def login(self):
        username = self.args.username or os.getenv("LABCAS_USERNAME", "").strip()
        password = self.args.password or os.getenv("LABCAS_PASSWORD", "")
        if not username or not password:
            raise SkipTest("LABCAS_USERNAME/LABCAS_PASSWORD not provided")
        self.driver.get(self.url("/labcas-ui/index.html"))
        wait_ready(self.driver, self.timeout)
        WebDriverWait(self.driver, self.timeout).until(
            EC.visibility_of_element_located((By.ID, "username"))
        ).send_keys(username)
        WebDriverWait(self.driver, self.timeout).until(
            EC.visibility_of_element_located((By.ID, "password"))
        ).send_keys(password)
        self.driver.find_element(By.ID, "login_button").click()

        def _logged_in_or_accept(d):
            if "/labcas-ui/s/index.html" in d.current_url or "/labcas-ui/m/index.html" in d.current_url:
                return "logged_in"
            if "/labcas-ui/index.html" not in d.current_url:
                user_cookie = d.get_cookie("user")
                user_value = (user_cookie or {}).get("value", "")
                if user_value and user_value != "Sign in":
                    return "logged_in"
                try:
                    user_menu = d.find_element(By.CSS_SELECTOR, ".dropdown-toggle")
                    if user_menu.is_displayed() and "Sign in" not in user_menu.text:
                        return "logged_in"
                except NoSuchElementException:
                    pass
            try:
                modal = d.find_element(By.ID, "acceptModal")
                if modal.is_displayed():
                    return "accept"
            except NoSuchElementException:
                return False
            return False

        outcome = WebDriverWait(self.driver, self.timeout).until(_logged_in_or_accept)
        if outcome == "accept":
            self.driver.find_element(By.CSS_SELECTOR, "#acceptModal button.btn-info").click()
            WebDriverWait(self.driver, self.timeout).until(
                lambda d: "/labcas-ui/s/index.html" in d.current_url
                or "/labcas-ui/m/index.html" in d.current_url
                or "/labcas-ui/download.html" in d.current_url
            )
        self.authenticated = True
        user_cookie = self.driver.get_cookie("user")
        token_cookie = self.driver.get_cookie("token")
        self.auth_token = (token_cookie or {}).get("value", "")
        return f"user_cookie={(user_cookie or {}).get('value', '(missing)')}"

    def require_auth(self):
        if not self.authenticated:
            raise SkipTest("authenticated session unavailable")

    def test_authenticated_file_api(self):
        self.require_auth()
        body = self.assert_fetch_ok(
            "/data-access-api/files/select?q=CollectionId:Prostate_MRI&wt=json&rows=0"
        )
        num_found = body.get("response", {}).get("numFound", 0)
        if num_found <= 0:
            raise AssertionError("Authenticated file API returned no files for Prostate_MRI")
        return f"Prostate_MRI files={num_found}"

    def wait_virtual_tags(self, collection_id):
        self.driver.execute_script(
            """
            localStorage.removeItem(arguments[0]);
            localStorage.removeItem(arguments[1]);
            """,
            f"hierarchy_tags_{collection_id}",
            f"hierarchy_tags_{collection_id}/placeholder",
        )
        self.driver.get(
            self.url(f"/labcas-ui/c/index.html?collection_id={quote(collection_id)}")
        )
        wait_ready(self.driver, self.timeout)

        def _tags_ready(d):
            data = d.execute_script(
                """
                const data = { items: [], value: "", visible: [] };
                if (window.jQuery && jQuery.fn.tagsinput) {
                    const tagLabel = (item) => {
                        if (item == null) return "";
                        if (typeof item === "string") return item;
                        return item.text || item.value || item.id || "";
                    };
                    try {
                        data.items = jQuery("#view_tags").tagsinput("items").map(tagLabel).filter(Boolean);
                    } catch (e) {}
                    try {
                        data.value = jQuery("#view_tags").val() || "";
                    } catch (e) {}
                }
                data.visible = Array.from(
                    document.querySelectorAll(".bootstrap-tagsinput .tag")
                ).map((el) => el.textContent.trim()).filter(Boolean);
                return data;
                """
            )
            values = []
            if isinstance(data, dict):
                values.extend(data.get("items") or [])
                values.extend(str(data.get("value") or "").split(","))
                values.extend(data.get("visible") or [])
            clean_values = [
                item.strip()
                for item in values
                if item and item.strip() and item.strip() != "[object Object]"
            ]
            clean_values = list(dict.fromkeys(clean_values))
            tags = {item.lower() for item in clean_values}
            expected = {item.lower() for item in DEFAULT_HIERARCHY_TAGS}
            if expected.issubset(tags):
                return ",".join(clean_values or DEFAULT_HIERARCHY_TAGS)
            return False

        return WebDriverWait(self.driver, self.timeout).until(_tags_ready)

    def test_default_virtual_hierarchy_ui(self):
        self.require_auth()
        details = []
        for collection_id in DEFAULT_HIERARCHY_COLLECTIONS:
            value = self.wait_virtual_tags(collection_id)
            details.append(f"{collection_id}={value}")
        return "; ".join(details)

    def test_pdac_virtual_facet_fields(self):
        self.require_auth()
        query = {
            "q": f"CollectionId:{PDAC_COLLECTION}",
            "facet": "true",
            "facet.limit": "-1",
            "facet.mincount": "1",
            "wt": "json",
            "rows": "0",
        }
        facet_part = "".join(f"&facet.field={quote(field, safe=':')}" for field in PDAC_EXPECTED_FACETS)
        body = self.assert_fetch_ok("/data-access-api/files/select?" + urlencode(query) + facet_part)
        fields = body.get("facet_counts", {}).get("facet_fields", {})
        missing = [field for field in PDAC_EXPECTED_FACETS if field not in fields]
        if missing:
            raise AssertionError(f"PDAC facet fields missing from response: {', '.join(missing)}")
        nonempty = [
            field
            for field in PDAC_EXPECTED_FACETS
            if len(fields.get(field, [])) >= 2
        ]
        return f"fields={','.join(PDAC_EXPECTED_FACETS)} nonempty={','.join(nonempty) or '(none)'}"

    def select_nested_dataset(self):
        if self.selected_nested_dataset:
            return self.selected_nested_dataset

        dynamic = self.find_nested_dataset(max_files=self.args.max_select_all_files, min_files=11)
        if dynamic:
            self.selected_nested_dataset = dynamic
            return self.selected_nested_dataset

        for dataset_id in NESTED_DATASET_CANDIDATES:
            exact_q = f'DatasetId:"{dataset_id}"'
            subtree_q = build_dataset_file_query(dataset_id)
            exact = self.assert_fetch_ok(
                "/data-access-api/files/select?" + urlencode({"q": exact_q, "wt": "json", "rows": "0"})
            )
            subtree = self.assert_fetch_ok(
                "/data-access-api/files/select?" + urlencode({"q": subtree_q, "wt": "json", "rows": "0"})
            )
            exact_count = exact.get("response", {}).get("numFound", 0)
            subtree_count = subtree.get("response", {}).get("numFound", 0)
            if subtree_count > max(exact_count, 0):
                self.selected_nested_dataset = {
                    "id": dataset_id,
                    "exact": exact_count,
                    "subtree": subtree_count,
                }
                return self.selected_nested_dataset
        raise AssertionError("No nested dataset candidate had descendant files")

    def dataset_file_counts(self, dataset_id):
        exact_q = f'DatasetId:"{dataset_id}"'
        subtree_q = build_dataset_file_query(dataset_id)
        exact = self.assert_fetch_ok(
            "/data-access-api/files/select?" + urlencode({"q": exact_q, "wt": "json", "rows": "0"})
        )
        subtree = self.assert_fetch_ok(
            "/data-access-api/files/select?" + urlencode({"q": subtree_q, "wt": "json", "rows": "0"})
        )
        return {
            "id": dataset_id,
            "exact": exact.get("response", {}).get("numFound", 0),
            "subtree": subtree.get("response", {}).get("numFound", 0),
        }

    def dataset_facets(self, collection_id):
        query = {
            "q": f'CollectionId:"{collection_id}"',
            "facet": "true",
            "facet.limit": "-1",
            "facet.mincount": "1",
            "facet.field": "DatasetId",
            "wt": "json",
            "rows": "0",
        }
        body = self.assert_fetch_ok("/data-access-api/files/select?" + urlencode(query))
        raw = body.get("facet_counts", {}).get("facet_fields", {}).get("DatasetId", [])
        facets = {}
        for index in range(0, len(raw), 2):
            dataset_id = raw[index]
            try:
                count = int(raw[index + 1])
            except (IndexError, TypeError, ValueError):
                continue
            if dataset_id:
                facets[str(dataset_id)] = count
        return facets

    def find_nested_dataset(self, max_files, min_files=1):
        for collection_id in NESTED_DATASET_SEARCH_COLLECTIONS:
            try:
                facets = self.dataset_facets(collection_id)
            except AssertionError:
                continue
            rollups = {}
            for dataset_id, count in facets.items():
                parts = [part for part in dataset_id.split("/") if part]
                for length in range(1, len(parts) + 1):
                    prefix = "/".join(parts[:length])
                    entry = rollups.setdefault(
                        prefix,
                        {"id": prefix, "exact": facets.get(prefix, 0), "subtree": 0},
                    )
                    entry["subtree"] += count

            candidates = [
                item
                for item in rollups.values()
                if item["subtree"] > item["exact"]
                and item["id"] != collection_id
                and min_files <= item["subtree"] <= max_files
            ]
            if candidates:
                candidates.sort(key=lambda item: (item["subtree"], item["id"]))
                return candidates[0]
        return None

    def wait_dataset_file_count(self, expected):
        def _count_matches(d):
            text = d.execute_script(
                "return (document.querySelector('#collection_files_len') || {}).textContent || '';"
            )
            digits = "".join(ch for ch in str(text) if ch.isdigit())
            return int(digits) if digits and int(digits) == expected else False

        return WebDriverWait(self.driver, self.timeout).until(_count_matches)

    def test_dataset_initial_file_count_uses_descendants(self):
        self.require_auth()
        selected = self.select_nested_dataset()
        dataset_id = selected["id"]
        expected = selected["subtree"]
        self.driver.get(
            self.url(f"/labcas-ui/d/index.html?dataset_id={quote(dataset_id, safe='/')}")
        )
        wait_ready(self.driver, self.timeout)
        self.wait_dataset_file_count(expected)
        return f"dataset={dataset_id} exact={selected['exact']} subtree={expected}"

    def test_dataset_select_all_counts_scope(self):
        self.require_auth()
        selected, result = self.select_all_scoped_dataset_files()
        return f"dataset={selected['id']} selected={result['selected']} ohif={result['ohif']}"

    def summarize_ohif_json(self, body):
        if not isinstance(body, dict):
            return {"available": False, "type": type(body).__name__}
        studies = body.get("studies") or []
        series_count = 0
        instance_count = 0
        modalities = {}
        for study in studies:
            for series in study.get("series") or []:
                series_count += 1
                modality = series.get("Modality") or "UNKNOWN"
                modalities[modality] = modalities.get(modality, 0) + 1
                instance_count += len(series.get("instances") or [])
        return {
            "available": True,
            "studies": len(studies),
            "series": series_count,
            "instances": instance_count,
            "modalities": modalities,
        }

    def ohif_launch_diagnostics(self):
        diag = {}
        try:
            diag.update(
                self.driver.execute_script(
                    """
                    const text = (el) => (el && (el.innerText || el.textContent || '') || '').trim();
                    const compact = (value, limit) => String(value || '').replace(/\\s+/g, ' ').trim().slice(0, limit);
                    const modalSelectors = '.modal, .modal.show, .swal2-container, .swal2-popup, [role="dialog"], .modal-dialog';
                    const modals = Array.from(document.querySelectorAll(modalSelectors))
                        .map((node) => {
                            const rect = node.getBoundingClientRect();
                            return {
                                text: compact(text(node), 500),
                                display: getComputedStyle(node).display,
                                visibility: getComputedStyle(node).visibility,
                                rectWidth: Math.round(rect.width),
                                rectHeight: Math.round(rect.height)
                            };
                        })
                        .filter((item) => item.text || item.rectWidth || item.rectHeight);
                    const checked = Array.from(document.querySelectorAll('#files-table input[type="checkbox"]:checked'));
                    const buttons = Array.from(document.querySelectorAll('button,a'))
                        .map((node) => compact(text(node), 80))
                        .filter(Boolean)
                        .slice(0, 30);
                    let localSelectionCount = -1;
                    try {
                        const raw = localStorage.getItem('dataset_local_selection_' + window.dataset_id) || '{}';
                        localSelectionCount = Object.keys(JSON.parse(raw)).length;
                    } catch (e) {}
                    return {
                        href: window.location.href,
                        title: document.title || '',
                        readyState: document.readyState,
                        bodySnippet: compact(text(document.body), 1200),
                        modals,
                        buttons,
                        checkedCount: checked.length,
                        localSelectionCount,
                        ohifMenuText: compact(text(document.querySelector('#view_ohif_link')), 200),
                        ohifMenuClass: (document.querySelector('#view_ohif_link') || {}).className || '',
                        viewButtonText: compact(text(document.querySelector('#view_image_btn')), 200)
                    };
                    """
                )
            )
        except Exception as exc:
            diag["pageDiagnosticError"] = f"{type(exc).__name__}: {exc}"

        simulated = self.direct_fetch_json("/labcas-ui/simulated.json?selenium=launch", timeout=10)
        diag["simulatedStatus"] = simulated.get("status")
        diag["simulatedError"] = simulated.get("error")
        diag["simulatedSummary"] = self.summarize_ohif_json(simulated.get("body"))
        try:
            diag["windowHandles"] = len(self.driver.window_handles)
            diag["currentUrl"] = self.driver.current_url
        except Exception as exc:
            diag["windowDiagnosticError"] = f"{type(exc).__name__}: {exc}"
        return diag

    def select_all_scoped_dataset_files(self):
        selected = self.selected_nested_dataset or self.select_nested_dataset()
        dataset_id = selected["id"]
        expected = selected["subtree"]
        if expected > self.args.max_select_all_files:
            raise SkipTest(
                f"dataset candidate has {expected} files; limit is {self.args.max_select_all_files}"
            )
        self.driver.get(
            self.url(f"/labcas-ui/d/index.html?dataset_id={quote(dataset_id, safe='/')}")
        )
        wait_ready(self.driver, self.timeout)
        self.wait_dataset_file_count(expected)
        self.driver.execute_script(
            """
            try { localStorage.removeItem('dataset_local_selection_' + arguments[0]); } catch (e) {}
            const checkAll = document.querySelector('#check_all');
            if (checkAll) {
                checkAll.checked = false;
                checkAll.disabled = false;
            }
            """,
            dataset_id,
        )
        checkbox = WebDriverWait(self.driver, self.timeout).until(
            EC.element_to_be_clickable((By.ID, "check_all"))
        )
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", checkbox)
        checkbox.click()

        def _selection_ready(d):
            raw = d.execute_script(
                """
                const key = 'dataset_local_selection_' + window.dataset_id;
                return localStorage.getItem(key) || '{}';
                """
            )
            selected_ids = safe_json_loads(raw, {})
            if len(selected_ids) != expected:
                return False
            ohif_text = d.execute_script(
                "return (document.querySelector('#dicom_size_ohif2') || {}).textContent || '0';"
            )
            try:
                ohif_count = int("".join(ch for ch in str(ohif_text) if ch.isdigit()) or "0")
            except ValueError:
                ohif_count = -1
            if ohif_count > expected:
                raise AssertionError(f"OHIF count {ohif_count} exceeds selected file count {expected}")
            if ohif_count == 100000 and expected != 100000:
                raise AssertionError("OHIF count leaked 100000 query limit")
            return {"selected": len(selected_ids), "ohif": ohif_count}

        result = WebDriverWait(self.driver, self.timeout).until(_selection_ready)
        return selected, result

    def test_ohif_viewer_opens_and_renders(self):
        self.require_auth()
        selected, result = self.select_visible_dicom_files_for_ohif(
            limit=2,
            dataset_id=OHIF_RENDER_DATASET,
        )
        if result["ohif"] <= 0:
            raise SkipTest(f"dataset={selected['id']} has no selected OHIF DICOM files")

        original_handles = set(self.driver.window_handles)
        view_button = WebDriverWait(self.driver, self.timeout).until(
            EC.element_to_be_clickable((By.ID, "view_image_btn"))
        )
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", view_button)
        self.safe_click(view_button)
        ohif_link = WebDriverWait(self.driver, self.timeout).until(
            EC.presence_of_element_located((By.ID, "view_ohif_link"))
        )
        if "disabled" in (ohif_link.get_attribute("class") or ""):
            raise AssertionError("OHIF viewer link is disabled after selecting DICOM files")
        self.safe_click(ohif_link)

        def _new_window():
            handles = set(self.driver.window_handles)
            if len(handles) > len(original_handles):
                new_handle = next(iter(handles - original_handles))
                self.driver.switch_to.window(new_handle)
                return "new_window"
            return False

        def _ohif_page():
            return "/labcas-ui/oh/" in (self.driver.current_url or "").lower()

        try:
            wait_for_any(self.driver, [_new_window, _ohif_page], timeout=self.timeout)
        except TimeoutException as exc:
            diag = self.ohif_launch_diagnostics()
            raise TimeoutException(
                "OHIF launch did not open viewer page | "
                f"dataset={selected['id']} selected={result['selected']} ohif={result['ohif']} | "
                f"diag={json.dumps(diag, sort_keys=True)[:3000]}"
            ) from exc
        WebDriverWait(self.driver, self.timeout).until(
            lambda d: "/labcas-ui/oh/" in (d.current_url or "").lower()
        )
        wait_ready(self.driver, self.timeout)

        simulated_path = ""
        simulated_summary = ""
        simulated = self.browser_fetch_json("/labcas-ui/simulated.json?selenium=1")
        if simulated.get("ok") and isinstance(simulated.get("body"), dict):
            simulated_path = str(self.artifact_dir / "ohif-simulated.json")
            Path(simulated_path).write_text(
                json.dumps(simulated["body"], indent=2),
                encoding="utf-8",
            )
            studies = simulated["body"].get("studies") or []
            series_count = 0
            instance_count = 0
            modalities = {}
            for study in studies:
                for series in study.get("series") or []:
                    series_count += 1
                    modality = series.get("Modality") or "UNKNOWN"
                    modalities[modality] = modalities.get(modality, 0) + 1
                    instance_count += len(series.get("instances") or [])
            simulated_summary = (
                f"simulated={simulated_path} studies={len(studies)} "
                f"series={series_count} instances={instance_count} modalities={modalities}"
            )
        else:
            simulated_summary = (
                f"simulated_fetch_status={simulated.get('status')} "
                f"error={simulated.get('error')}"
            )

        iframe = WebDriverWait(self.driver, self.timeout).until(
            EC.presence_of_element_located((By.ID, "dicomViewer"))
        )
        iframe_src = (iframe.get_attribute("src") or "").strip()
        if not iframe_src:
            raise AssertionError("OHIF iframe src is empty")

        try:
            self.driver.switch_to.frame(iframe)

            def _viewer_canvas(d):
                return d.execute_script(
                    """
                    const bodyText = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase();
                    if (/(something went wrong|error message|getdisplaysetbyuid|failed to load|cannot display|unauthorized)/.test(bodyText)) {
                        throw new Error(bodyText.slice(0, 500));
                    }
                    const canvases = Array.from(document.querySelectorAll('canvas')).filter((canvas) => {
                        const rect = canvas.getBoundingClientRect();
                        return canvas.width > 0 && canvas.height > 0 && rect.width > 120 && rect.height > 120;
                    });
                    return canvases.length;
                    """
                )

            try:
                canvas_count = WebDriverWait(self.driver, self.timeout).until(_viewer_canvas)
            except TimeoutException as exc:
                diag = self.ohif_frame_diagnostics()
                raise TimeoutException(
                    "OHIF iframe did not expose a renderable canvas | "
                    f"iframe={iframe_src} | {simulated_summary} | "
                    f"diag={json.dumps(diag, sort_keys=True)[:2000]}"
                ) from exc
            except JavascriptException as exc:
                diag = self.ohif_frame_diagnostics()
                raise JavascriptException(
                    "OHIF iframe reported a route error | "
                    f"iframe={iframe_src} | {simulated_summary} | "
                    f"diag={json.dumps(diag, sort_keys=True)[:2000]} | original={exc}"
                ) from exc
            frame_url = self.driver.execute_script("return window.location.href;")
        finally:
            try:
                self.driver.switch_to.default_content()
            except Exception:
                pass

        return (
            f"dataset={selected['id']} ohif={result['ohif']} "
            f"page={self.driver.current_url} iframe={iframe_src} "
            f"canvases={canvas_count} {simulated_summary}"
        )

    def select_visible_dicom_files_for_ohif(self, limit=2, dataset_id=None):
        selected = self.dataset_file_counts(dataset_id) if dataset_id else (
            self.selected_nested_dataset or self.select_nested_dataset()
        )
        dataset_id = selected["id"]
        expected = selected["subtree"]
        if expected <= 0:
            raise SkipTest(f"dataset={dataset_id} has no files")
        self.driver.get(
            self.url(f"/labcas-ui/d/index.html?dataset_id={quote(dataset_id, safe='/')}")
        )
        wait_ready(self.driver, self.timeout)
        self.wait_dataset_file_count(expected)
        WebDriverWait(self.driver, self.timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#files-table tbody input[type='checkbox']"))
        )
        self.driver.execute_script(
            """
            try { localStorage.removeItem('dataset_local_selection_' + arguments[0]); } catch (e) {}
            Array.from(document.querySelectorAll("#files-table tbody input[type='checkbox']")).forEach((box) => {
                if (box.checked) {
                    box.checked = false;
                    box.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            try { updateLocalSelectionCounts(); } catch (e) {}
            """,
            dataset_id,
        )

        chosen_boxes = self.wait_visible_dicom_checkboxes(limit)
        chosen = []
        for checkbox in chosen_boxes[:limit]:
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});",
                checkbox,
            )
            self.safe_click(checkbox)
            chosen.append(checkbox.get_attribute("value") or "")
        if not chosen:
            raise SkipTest(f"dataset={dataset_id} has no visible DICOM files to open in OHIF")

        def _ohif_count_ready(d):
            state = d.execute_script(
                """
                const link = document.querySelector('#view_ohif_link');
                return {
                    text: (document.querySelector('#dicom_size_ohif2') || {}).textContent || '0',
                    enabled: Boolean(
                        link &&
                        !link.classList.contains('disabled') &&
                        link.getAttribute('aria-disabled') !== 'true'
                    )
                };
                """
            )
            count = int("".join(ch for ch in str(state["text"]) if ch.isdigit()) or "0")
            if count == len(chosen) and state["enabled"]:
                return {"selected": len(chosen), "ohif": count}
            return False

        result = WebDriverWait(self.driver, self.timeout).until(_ohif_count_ready)
        return selected, result

    def wait_visible_dicom_checkboxes(self, min_count):
        def _checkbox_name(checkbox):
            name = (checkbox.get_attribute("data-name") or "").strip()
            if name:
                return name
            try:
                row = checkbox.find_element(By.XPATH, "./ancestor::tr")
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) > 1:
                    return cells[1].text or ""
            except Exception:
                return ""
            return ""

        def _dicom_boxes(_driver):
            checkboxes = _driver.find_elements(
                By.CSS_SELECTOR, "#files-table tbody input[type='checkbox']"
            )
            dicom_boxes = [
                checkbox
                for checkbox in checkboxes
                if _checkbox_name(checkbox).lower().endswith((".dcm", ".dicom"))
            ]
            return dicom_boxes if len(dicom_boxes) >= min_count else False

        return WebDriverWait(self.driver, self.timeout).until(_dicom_boxes)

    def run(self):
        self.start()
        try:
            steps = [
                ("Environment config loads", self.test_environment_config),
                ("Landing page dashboard loads", self.test_landing_page),
                ("Public collection search API returns data", self.test_public_collection_search_api),
                ("Collection details render RDF protocol shortname", self.test_collection_details_and_rdf),
                ("Guest file API remains blocked", self.test_guest_file_access_is_blocked),
                ("Login with supplied credentials", self.login),
                ("Authenticated file API unlocks file metadata", self.test_authenticated_file_api),
                ("Default virtual hierarchy tags render", self.test_default_virtual_hierarchy_ui),
                ("PDAC virtual facet fields are queryable", self.test_pdac_virtual_facet_fields),
                ("Dataset initial file count includes descendants", self.test_dataset_initial_file_count_uses_descendants),
                ("Dataset select-all counts stay scoped", self.test_dataset_select_all_counts_scope),
                ("OHIF viewer opens and renders selected DICOMs", self.test_ohif_viewer_opens_and_renders),
            ]
            for name, func in steps:
                self.run_step(name, func)
        finally:
            self.write_reports()
            if self.args.keep_open:
                log("Browser left open for inspection. Press Enter to close.")
                try:
                    input()
                except EOFError:
                    time.sleep(300)
            self.stop()

    def write_reports(self):
        stamp = now_stamp()
        report = {
            "generated_at": datetime.now().isoformat(),
            "base_url": self.base_url,
            "headless": self.args.headless,
            "authenticated": self.authenticated,
            "results": [result.__dict__ for result in self.results],
            "summary": {
                "pass": sum(1 for result in self.results if result.status == "PASS"),
                "fail": sum(1 for result in self.results if result.status == "FAIL"),
                "skip": sum(1 for result in self.results if result.status == "SKIP"),
            },
        }
        json_path = self.report_dir / f"labcas-selenium-comprehensive-{stamp}.json"
        md_path = self.report_dir / f"labcas-selenium-comprehensive-{stamp}.md"
        json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        md_path.write_text(self.render_markdown(report), encoding="utf-8")
        log(f"Wrote JSON report: {json_path}")
        log(f"Wrote Markdown report: {md_path}")
        latest = self.report_dir / "labcas-selenium-comprehensive-latest.md"
        latest.write_text(self.render_markdown(report), encoding="utf-8")

    def render_markdown(self, report):
        lines = [
            "# LabCAS Selenium Comprehensive Report",
            "",
            f"- Generated: `{report['generated_at']}`",
            f"- Base URL: `{report['base_url']}`",
            f"- Headless: `{report['headless']}`",
            f"- Authenticated: `{report['authenticated']}`",
            f"- Summary: PASS={report['summary']['pass']} FAIL={report['summary']['fail']} SKIP={report['summary']['skip']}",
            "",
            "| Status | Step | Duration | Detail |",
            "| --- | --- | ---: | --- |",
        ]
        for result in report["results"]:
            detail = (result.get("detail") or "").replace("\n", "<br>")
            if result.get("screenshot"):
                detail += f"<br>Screenshot: `{result['screenshot']}`"
            console_count = len(result.get("console_errors") or [])
            if console_count:
                detail += f"<br>Console warnings/errors: {console_count}"
            lines.append(
                f"| {result['status']} | {result['name']} | {result['duration_s']}s | {detail} |"
            )
        return "\n".join(lines) + "\n"


def parse_args():
    parser = argparse.ArgumentParser(description="Comprehensive LabCAS Selenium test suite")
    parser.add_argument("--base-url", default=os.getenv("LABCAS_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--headless", action="store_true", default=os.getenv("LABCAS_HEADLESS", "1") == "1")
    parser.add_argument("--headed", dest="headless", action="store_false")
    parser.add_argument("--timeout", type=int, default=int(os.getenv("LABCAS_TIMEOUT", str(DEFAULT_TIMEOUT))))
    parser.add_argument("--username", default=os.getenv("LABCAS_USERNAME", ""))
    parser.add_argument("--password", default=os.getenv("LABCAS_PASSWORD", ""))
    parser.add_argument("--report-dir", default=os.getenv("LABCAS_REPORT_DIR", "reports"))
    parser.add_argument("--keep-open", action="store_true")
    parser.add_argument("--fail-fast", action="store_true")
    parser.add_argument("--show-traceback", action="store_true")
    parser.add_argument(
        "--max-select-all-files",
        type=int,
        default=int(os.getenv("LABCAS_MAX_SELECT_ALL_FILES", "500")),
        help="Skip select-all UI test if the chosen dataset has more files than this",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    suite = LabcasSuite(args)
    suite.run()
    failures = [result for result in suite.results if result.status == "FAIL"]
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
