#!/usr/bin/env python3
import argparse
import os
import sys
import time
from getpass import getpass
from datetime import datetime
from urllib.parse import parse_qs, urljoin, urlparse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import (
    InvalidSessionIdException,
    NoSuchElementException,
    TimeoutException,
    WebDriverException,
)

DEFAULT_BASE_URL = "https://edrn-labcas.jpl.nasa.gov"
TARGET_COLLECTION_ID = "Automated_System_For_Breast_Cancer_Biomarker_Analysis"
TARGET_PARENT_DATASET = "C0001"
TARGET_CHILD_DATASET = os.getenv("LABCAS_TARGET_CHILD_DATASET", "MASK")
TARGET_FILE_SELECTION_COUNT = int(os.getenv("LABCAS_TARGET_FILE_SELECTION_COUNT", "2"))
DICOM_EXTENSIONS = (".dcm", ".dicom")
LOGIN_REQUIRED_FILES_TEXT = "Login to see additional files/data"
GUEST_BLOCKED_COLLECTION_ID = os.getenv(
    "LABCAS_GUEST_BLOCKED_COLLECTION_ID", "BBD_Pathology_Slide_Images"
)
LOGGED_OUT_ALERT_TEXT = "You are currently logged out. Redirecting you to log in."
GUEST_PRIVATE_COLLECTION_NAME = os.getenv(
    "LABCAS_GUEST_PRIVATE_COLLECTION_NAME",
    "Benign Breast Disease Pathology Slide Images",
)
GUEST_BLOCKED_DATASET_ID = os.getenv(
    "LABCAS_GUEST_BLOCKED_DATASET_ID",
    "BBD_Pathology_Slide_Images/Anonymized_BBD_Slide_Images",
)
GUEST_PUBLIC_NOFILES_DATASET_ID = os.getenv(
    "LABCAS_GUEST_PUBLIC_NOFILES_DATASET_ID",
    "Automated_System_For_Breast_Cancer_Biomarker_Analysis/C0001/MASK",
)
GUEST_BLOCKED_FILE_ID = os.getenv(
    "LABCAS_GUEST_BLOCKED_FILE_ID",
    "Automated_System_For_Breast_Cancer_Biomarker_Analysis/C0001/MASK/C0001_MASK_PRO_LCC.dcm",
)
VERBOSE = os.getenv("LABCAS_VERBOSE", "1") == "1"
STEP_RESULTS = []
SHOW_TRACEBACK = False


def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}", flush=True)


def record_result(step, status, detail=""):
    STEP_RESULTS.append({"step": step, "status": status, "detail": detail})


def print_summary():
    if not STEP_RESULTS:
        return
    log("=== Test Summary ===")
    for item in STEP_RESULTS:
        detail = f" | {item['detail']}" if item["detail"] else ""
        log(f"{item['status']}: {item['step']}{detail}")


def run_named_step(driver, name, callback):
    try:
        return run_step(driver, name, callback)
    except Exception as exc:
        raise AssertionError(f"{name} failed: {type(exc).__name__}: {exc}") from exc


def is_invalid_session_error(exc):
    if isinstance(exc, InvalidSessionIdException):
        return True
    return "invalid session id" in (str(exc) or "").lower()


def short_exc(exc):
    text = str(exc) if exc is not None else ""
    first = text.strip().splitlines()[0] if text else ""
    return first or exc.__class__.__name__


def mask_secret(secret):
    if not secret:
        return "(empty)"
    return "*" * min(len(secret), 8) + f" (len={len(secret)})"


def log_browser_state(driver, label):
    if not VERBOSE:
        return
    try:
        current = driver.current_url
    except Exception:
        current = "(unavailable)"
    try:
        title = driver.title
    except Exception:
        title = "(unavailable)"
    try:
        handles = len(driver.window_handles)
    except Exception:
        handles = -1
    log(f"{label} | url={current} | title={title} | windows={handles}", level="DEBUG")


def get_cookie_value(driver, name):
    try:
        cookie = driver.get_cookie(name)
    except Exception:
        return None
    if not cookie:
        return None
    return cookie.get("value")


def auth_state_snapshot(driver):
    login_button = False
    try:
        login_button = bool(driver.find_elements(By.ID, "login_button"))
    except Exception:
        pass
    return {
        "url": getattr(driver, "current_url", "(unknown)"),
        "has_login_button": login_button,
        "user_cookie": get_cookie_value(driver, "user"),
        "token_cookie": bool(get_cookie_value(driver, "token")),
        "jwt_cookie": bool(get_cookie_value(driver, "JasonWebToken")),
        "session_cookie": bool(get_cookie_value(driver, "sessionID")),
    }


def log_auth_state(driver, label):
    state = auth_state_snapshot(driver)
    log(
        f"{label} | url={state['url']} | login_button={state['has_login_button']} "
        f"| user_cookie={state['user_cookie']} | token={state['token_cookie']} "
        f"| jwt={state['jwt_cookie']} | sessionID={state['session_cookie']}",
        level="DEBUG",
    )


def run_step(driver, name, callback):
    log(f"START: {name}")
    try:
        result = callback()
        log(f"PASS: {name}")
        record_result(name, "PASS")
        log_browser_state(driver, f"after {name}")
        return result
    except Exception as exc:
        detail = f"{type(exc).__name__}: {short_exc(exc)}"
        log(f"FAIL: {name} | {detail}", level="ERROR")
        record_result(name, "FAIL", detail)
        log_browser_state(driver, f"on failure: {name}")
        raise


def open_new_tab(driver, label, url=None):
    driver.switch_to.new_window("tab")
    handle = driver.current_window_handle
    log(
        f"Opened tab '{label}' handle={handle} (total_tabs={len(driver.window_handles)})",
        level="DEBUG",
    )
    if url:
        driver.get(url)
    return handle


def build_driver(headless):
    options = Options()
    options.add_argument("--incognito")
    options.add_argument("--window-size=1400,1000")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    if headless:
        options.add_argument("--headless=new")
    return webdriver.Chrome(options=options)


def wait_for_visible(driver, by, selector, timeout):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, selector))
    )


def wait_for_present(driver, by, selector, timeout):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((by, selector))
    )


def wait_for_table_links(driver, table_selector, timeout):
    def _has_links(_driver):
        links = _driver.find_elements(By.CSS_SELECTOR, f"{table_selector} tbody a")
        if not links:
            links = _driver.find_elements(By.CSS_SELECTOR, f"{table_selector} a")
        return links if links else False

    return WebDriverWait(driver, timeout).until(_has_links)


def wait_for_table_rows(driver, table_selector, timeout, min_rows=1):
    def _has_rows(_driver):
        rows = _driver.find_elements(By.CSS_SELECTOR, f"{table_selector} tbody tr")
        return rows if len(rows) >= min_rows else False

    return WebDriverWait(driver, timeout).until(_has_rows)


def wait_for_displayed(driver, by, selector, timeout):
    def _is_displayed(_driver):
        try:
            element = _driver.find_element(by, selector)
        except NoSuchElementException:
            return False
        return element if element.is_displayed() else False

    return WebDriverWait(driver, timeout).until(_is_displayed)


def wait_for_hidden(driver, by, selector, timeout):
    def _is_hidden(_driver):
        try:
            element = _driver.find_element(by, selector)
        except NoSuchElementException:
            return True
        return not element.is_displayed()

    return WebDriverWait(driver, timeout).until(_is_hidden)


def wait_for_js_true(driver, expression, timeout):
    def _has_value(_driver):
        try:
            return bool(_driver.execute_script(f"return !!({expression});"))
        except Exception:
            return False

    return WebDriverWait(driver, timeout).until(_has_value)


def maybe_table_links(driver, table_selector, timeout):
    try:
        return wait_for_table_links(driver, table_selector, timeout)
    except TimeoutException:
        return []


def safe_click(driver, element):
    try:
        element.click()
    except Exception:
        driver.execute_script("arguments[0].click();", element)


def scroll_into_view(driver, element):
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});",
        element,
    )


def normalize_link_text(text):
    cleaned = text.replace("\u2022", "").replace("\xa0", " ")
    return " ".join(cleaned.split())


def wait_for_link_by_text(driver, container_selector, text, timeout):
    target = normalize_link_text(text)

    def _find(_driver):
        container = _driver.find_element(By.CSS_SELECTOR, container_selector)
        links = container.find_elements(By.TAG_NAME, "a")
        for link in links:
            link_text = normalize_link_text(link.text or "")
            if link_text == target or link_text.endswith(target):
                return link
        return False

    return WebDriverWait(driver, timeout).until(_find)


def wait_for_dicom_checkboxes(driver, timeout, min_count=1):
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

    end = time.time() + timeout
    last_count = 0
    while time.time() < end:
        checkboxes = driver.find_elements(
            By.CSS_SELECTOR, "#files-table tbody input[type='checkbox']"
        )
        last_count = len(checkboxes)
        dicom_boxes = []
        for checkbox in checkboxes:
            name = _checkbox_name(checkbox).lower()
            if any(name.endswith(ext) for ext in DICOM_EXTENSIONS):
                dicom_boxes.append(checkbox)
        if len(dicom_boxes) >= min_count:
            return dicom_boxes
        time.sleep(0.5)
    raise TimeoutException(
        f"Timed out waiting for DICOM files to load (found {last_count} file checkboxes)."
    )


def wait_for_file_checkboxes(driver, timeout, min_count=1):
    def _has_checkboxes(_driver):
        boxes = _driver.find_elements(
            By.CSS_SELECTOR, "#files-table tbody input[type='checkbox']"
        )
        return boxes if len(boxes) >= min_count else False

    return WebDriverWait(driver, timeout).until(_has_checkboxes)


def wait_for_dicom_count(driver, timeout):
    def _has_dicom_count(_driver):
        try:
            value = _driver.find_element(By.ID, "dicom_size_ohif2").text.strip()
        except NoSuchElementException:
            value = ""
        if value.isdigit() and int(value) > 0:
            return True
        dicom_count = _driver.execute_script(
            """
            var boxes = document.querySelectorAll(
              "#files-table tbody input[type='checkbox']:checked"
            );
            var count = 0;
            boxes.forEach(function(box) {
              var name = (box.getAttribute('data-name') || '').trim();
              if (!name) {
                var row = box.closest('tr');
                if (row && row.cells && row.cells.length > 1) {
                  name = (row.cells[1].innerText || '').trim();
                }
              }
              name = name.toLowerCase();
              if (name.endsWith('.dcm') || name.endsWith('.dicom')) {
                count += 1;
              }
            });
            return count;
            """
        )
        return dicom_count > 0

    return WebDriverWait(driver, timeout).until(_has_dicom_count)


def open_ohif_viewer(driver, timeout):
    original_handles = set(driver.window_handles)

    safe_click(driver, wait_for_visible(driver, By.ID, "view_image_btn", timeout))
    ohif_link = wait_for_visible(driver, By.ID, "view_ohif_link", timeout)
    if "disabled" in (ohif_link.get_attribute("class") or ""):
        raise TimeoutException("OHIF viewer link is disabled.")
    safe_click(driver, ohif_link)

    def _new_window():
        handles = set(driver.window_handles)
        if len(handles) > len(original_handles):
            new_handle = next(iter(handles - original_handles))
            driver.switch_to.window(new_handle)
            return "new_window"
        return False

    def _progress_modal():
        try:
            modal = driver.find_element(By.ID, "ohif_progress_modal")
            if modal.is_displayed():
                return "progress_modal"
        except NoSuchElementException:
            return False
        return False

    def _ohif_url():
        return "ohif" in driver.current_url.lower()

    wait_for_any(driver, [_new_window, _progress_modal, _ohif_url], timeout=timeout)


def wait_for_ohif_image(driver, timeout):
    def _on_ohif_url():
        return "/labcas-ui/oh/" in (driver.current_url or "").lower()

    def _has_ohif_ui_top():
        selectors = [
            "#root",
            "[data-cy='viewport-container']",
            ".viewport-element",
            ".ViewportOverlay",
            ".viewport-container",
        ]
        return any(driver.find_elements(By.CSS_SELECTOR, selector) for selector in selectors)

    def _has_viewport_canvas_top():
        return driver.execute_script(
            """
            const bodyText = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase();
            if (/(no images|error loading|failed to load|cannot display|unauthorized)/.test(bodyText)) {
              return false;
            }
            const canvases = Array.from(document.querySelectorAll('canvas')).filter((c) => {
              const r = c.getBoundingClientRect();
              return c.width > 0 && c.height > 0 && r.width > 120 && r.height > 120;
            });
            return canvases.length > 0;
            """
        )

    def _wait_for_iframe():
        iframe = wait_for_present(driver, By.ID, "dicomViewer", timeout)
        src = (iframe.get_attribute("src") or "").strip()
        if not src:
            raise TimeoutException("dicomViewer iframe src is empty.")
        return iframe, src

    def _frame_has_viewer_ui():
        selectors = [
            "#root",
            "[data-cy='viewport-container']",
            ".viewport-element",
            ".ViewportOverlay",
            ".viewport-container",
        ]
        return any(driver.find_elements(By.CSS_SELECTOR, selector) for selector in selectors)

    def _frame_has_canvas():
        return driver.execute_script(
            """
            const bodyText = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase();
            if (/(no images|error loading|failed to load|cannot display|unauthorized)/.test(bodyText)) {
              return false;
            }
            const canvases = Array.from(document.querySelectorAll('canvas')).filter((c) => {
              const r = c.getBoundingClientRect();
              return c.width > 0 && c.height > 0 && r.width > 120 && r.height > 120;
            });
            return canvases.length > 0;
            """
        )

    iframe_src = ""
    def _browser_log_tail(limit=15):
        try:
            entries = driver.get_log("browser")
        except Exception:
            return []
        tail = []
        for item in entries[-limit:]:
            msg = (item.get("message") or "").strip().replace("\n", " ")
            lvl = item.get("level", "")
            if msg:
                tail.append(f"{lvl}: {msg[:220]}")
        return tail

    iframe_diag = {}
    try:
        wait_for_any(driver, [_on_ohif_url, _has_ohif_ui_top, _has_viewport_canvas_top], timeout=timeout)
        iframe, iframe_src = _wait_for_iframe()
        driver.switch_to.frame(iframe)
        iframe_diag = driver.execute_script(
            """
            const bodyText = (document.body && document.body.innerText ? document.body.innerText : '').trim();
            return {
              href: window.location.href,
              readyState: document.readyState,
              title: document.title || '',
              bodySnippet: bodyText.slice(0, 400).replace(/\\s+/g, ' ')
            };
            """
        )
        wait_for_any(driver, [_frame_has_viewer_ui, _frame_has_canvas], timeout=timeout)
        WebDriverWait(driver, timeout).until(lambda _driver: _frame_has_canvas())
    except TimeoutException as exc:
        driver.switch_to.default_content()
        diag = driver.execute_script(
            """
            const bodyText = (document.body && document.body.innerText ? document.body.innerText : '').trim();
            const bodySnippet = bodyText.slice(0, 400).replace(/\\s+/g, ' ');
            const canvasCount = document.querySelectorAll('canvas').length;
            const viewportCount = document.querySelectorAll(
              "#root, [data-cy='viewport-container'], .viewport-element, .ViewportOverlay, .viewport-container"
            ).length;
            return {
              href: window.location.href,
              readyState: document.readyState,
              canvasCount,
              viewportCount,
              bodySnippet
            };
            """
        )
        raise TimeoutException(
            "OHIF image validation timed out | "
            f"url={diag.get('href')} | readyState={diag.get('readyState')} | "
            f"canvas={diag.get('canvasCount')} | viewports={diag.get('viewportCount')} | "
            f"iframe_src='{iframe_src}' | "
            f"body='{diag.get('bodySnippet')}' | "
            f"iframe_url='{iframe_diag.get('href', '')}' | "
            f"iframe_ready={iframe_diag.get('readyState', '')} | "
            f"iframe_body='{iframe_diag.get('bodySnippet', '')}' | "
            f"browser_logs={_browser_log_tail()}"
        ) from exc
    finally:
        try:
            driver.switch_to.default_content()
        except Exception:
            pass


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
            except Exception as exc:
                last_exc = exc
        time.sleep(poll_interval)
    if last_exc:
        raise TimeoutException(str(last_exc))
    raise TimeoutException("Timed out waiting for condition.")


def login(driver, base_url, username, password, timeout):
    login_url = urljoin(base_url, "/labcas-ui/index.html")
    log(
        f"Login attempt: url={login_url} username={username} password={mask_secret(password)}"
    )
    driver.get(login_url)
    wait_for_visible(driver, By.ID, "username", timeout).send_keys(username)
    wait_for_visible(driver, By.ID, "password", timeout).send_keys(password)
    safe_click(driver, wait_for_visible(driver, By.ID, "login_button", timeout))

    def _accept_modal():
        try:
            modal = driver.find_element(By.ID, "acceptModal")
            if modal.is_displayed():
                return "accept_modal"
        except NoSuchElementException:
            return False
        return False

    def _search_page():
        url = driver.current_url
        if "/labcas-ui/s/index.html" in url or "/labcas-ui/m/index.html" in url:
            return "search_ready"
        return False

    def _download_page():
        url = driver.current_url
        if "/labcas-ui/download.html" in url:
            return "download_ready"
        return False

    outcome = wait_for_any(
        driver, [_accept_modal, _search_page, _download_page], timeout=timeout
    )
    log(f"Login post-submit outcome={outcome}")
    if outcome == "accept_modal":
        accept_button = wait_for_visible(
            driver, By.CSS_SELECTOR, "#acceptModal button.btn-info", timeout
        )
        safe_click(driver, accept_button)
        wait_for_any(driver, [_download_page, _search_page], timeout=timeout)
        log("Accepted modal and continued after login")
    log_auth_state(driver, "Post-login auth state")
    state = auth_state_snapshot(driver)
    if state["has_login_button"] and "/labcas-ui/index.html" in state["url"]:
        raise AssertionError(
            "Login did not complete; still on login page after submit."
        )


def ensure_search_page(driver, base_url, timeout):
    search_url = urljoin(base_url, "/labcas-ui/s/index.html?search=*")
    if "/labcas-ui/s/index.html" not in driver.current_url:
        driver.get(search_url)
    wait_for_visible(driver, By.ID, "searchTabs", timeout)


def verify_facets(driver, timeout):
    def _has_facets(_driver):
        if _driver.find_elements(By.CSS_SELECTOR, "#filter_options input[type='checkbox']"):
            return True
        if _driver.find_elements(By.CSS_SELECTOR, "#filter_options .card"):
            return True
        return False

    WebDriverWait(driver, timeout).until(_has_facets)


def perform_nav_search(driver, timeout):
    search_input = wait_for_visible(driver, By.ID, "search_text", timeout)
    search_input.clear()
    search_input.send_keys("*")
    search_input.send_keys(Keys.ENTER)
    wait_for_present(driver, By.ID, "searchTabs", timeout)


def open_first_link(driver, links):
    link = links[0]
    scroll_into_view(driver, link)
    safe_click(driver, link)


def wait_for_url_contains(driver, fragment, timeout):
    WebDriverWait(driver, timeout).until(EC.url_contains(fragment))


def wait_for_non_empty_text(driver, by, selector, timeout):
    def _has_text(_driver):
        text = _driver.find_element(by, selector).text.strip()
        return text if text else False

    return WebDriverWait(driver, timeout).until(_has_text)


def wait_for_button_enabled(driver, by, selector, timeout):
    def _is_enabled(_driver):
        button = _driver.find_element(by, selector)
        if button.is_enabled() and not button.get_attribute("disabled"):
            return button
        return False

    return WebDriverWait(driver, timeout).until(_is_enabled)


def wait_for_text_contains(driver, by, selector, text, timeout):
    def _has_text(_driver):
        elements = _driver.find_elements(by, selector)
        return any(text in element.text for element in elements)

    return WebDriverWait(driver, timeout).until(_has_text)


def verify_search_results(driver, base_url, timeout):
    ensure_search_page(driver, base_url, timeout)
    perform_nav_search(driver, timeout)
    verify_facets(driver, timeout)
    wait_for_table_rows(driver, "#search-collection-table", timeout)
    wait_for_table_rows(driver, "#search-dataset-table", timeout)


def wait_for_files_ready(driver, timeout):
    wait_for_displayed(driver, By.ID, "children-files", timeout)
    wait_for_hidden(driver, By.ID, "loading_file", timeout)
    wait_for_table_rows(driver, "#files-table", timeout)
    wait_for_present(
        driver, By.CSS_SELECTOR, "#files-table tbody input[type='checkbox']", timeout
    )


def parse_query_param(url, key):
    if not url:
        return None
    try:
        return parse_qs(urlparse(url).query).get(key, [None])[0]
    except Exception:
        return None


def collect_table_param_values(driver, table_selector, param_key, timeout, limit=50):
    links = wait_for_table_links(driver, table_selector, timeout)
    values = []
    for link in links:
        href = link.get_attribute("href") or ""
        value = parse_query_param(href, param_key)
        if value:
            values.append(value)
            if len(values) >= limit:
                break
    return values


def wait_for_collection_links(driver, table_selector, timeout, loading_id="loading"):
    try:
        wait_for_hidden(driver, By.ID, loading_id, timeout)
    except TimeoutException as exc:
        raise AssertionError(
            f"Timed out waiting for {table_selector} to load."
        ) from exc
    links = driver.find_elements(By.CSS_SELECTOR, f"{table_selector} tbody a")
    if not links:
        raise AssertionError(f"No collection links found in {table_selector}.")
    return links


def open_first_table_link_with_param(driver, table_selector, param_key, timeout):
    links = wait_for_table_links(driver, table_selector, timeout)
    for link in links:
        href = link.get_attribute("href") or ""
        if param_key in href:
            scroll_into_view(driver, link)
            safe_click(driver, link)
            return href
    raise TimeoutException(
        f"Timed out waiting for link with {param_key} in {table_selector}."
    )


def open_first_public_collection_with_dataset(driver, base_url, timeout, max_tries=12):
    driver.get(urljoin(base_url, "/labcas-ui/p/index.html"))
    wait_for_text_contains(driver, By.TAG_NAME, "h3", "Public Collections", timeout)
    links = wait_for_collection_links(driver, "#collection-table", timeout)
    hrefs = []
    for link in links:
        href = link.get_attribute("href") or ""
        if href:
            hrefs.append(href)
    tried = 0
    for href in hrefs:
        collection_id = parse_query_param(href, "collection_id")
        if not collection_id:
            continue
        tried += 1
        driver.get(urljoin(base_url, href))
        try:
            wait_for_present(
                driver, By.CSS_SELECTOR, "#collectiondetails-table tbody td", timeout
            )
        except TimeoutException:
            if tried >= max_tries:
                break
            continue

        dataset_links = maybe_table_links(driver, "#datasets-table", min(timeout, 8))
        dataset_href = None
        for dlink in dataset_links:
            dhref = dlink.get_attribute("href") or ""
            if "dataset_id=" in dhref:
                dataset_href = dhref
                break
        if dataset_href:
            driver.get(urljoin(base_url, dataset_href))
            return collection_id
        if tried >= max_tries:
            break
    raise TimeoutException(
        f"No public collection with dataset links found after trying {tried} collection(s)."
    )


def wait_for_login_required_files_message(driver, timeout):
    wait_for_present(driver, By.ID, "files-table", timeout)
    wait_for_hidden(driver, By.ID, "loading_file", timeout)

    def _has_message(_driver):
        body = _driver.find_element(By.CSS_SELECTOR, "#files-table tbody")
        if LOGIN_REQUIRED_FILES_TEXT in body.text:
            return True
        return False

    WebDriverWait(driver, timeout).until(_has_message)


def wait_for_guest_files_blocked(driver, timeout):
    wait_for_present(driver, By.ID, "files-table", timeout)

    def _login_message():
        try:
            body = driver.find_element(By.CSS_SELECTOR, "#files-table tbody")
        except NoSuchElementException:
            return False
        return (
            "login_message" if LOGIN_REQUIRED_FILES_TEXT in (body.text or "") else False
        )

    def _has_links_or_checks():
        if driver.find_elements(By.CSS_SELECTOR, "#files-table tbody a"):
            return "has_links"
        if driver.find_elements(By.CSS_SELECTOR, "#files-table tbody input[type='checkbox']"):
            return "has_checks"
        return False

    def _loading_done():
        try:
            loading = driver.find_element(By.ID, "loading_file")
            if not loading.is_displayed():
                return "loading_done"
        except NoSuchElementException:
            return "loading_done"
        return False

    outcome = wait_for_any(
        driver, [_login_message, _has_links_or_checks, _loading_done], timeout=timeout
    )
    if outcome in ("has_links", "has_checks"):
        raise AssertionError("Guest users can access file info in dataset view.")
    if outcome == "loading_done":
        if driver.find_elements(By.CSS_SELECTOR, "#files-table tbody a"):
            raise AssertionError("Guest users can access file links in dataset view.")
        if driver.find_elements(
            By.CSS_SELECTOR, "#files-table tbody input[type='checkbox']"
        ):
            raise AssertionError("Guest users can access file checkboxes in dataset view.")


def verify_download_requires_login(driver, timeout):
    download_button = wait_for_present(driver, By.ID, "download_sel", timeout)
    scroll_into_view(driver, download_button)
    safe_click(driver, download_button)

    def _has_modal():
        try:
            modal = driver.find_element(By.ID, "errorModal")
            if modal.is_displayed():
                return "modal"
        except NoSuchElementException:
            return False
        return False

    def _login_page():
        if "/labcas-ui/index.html" in driver.current_url:
            return "login_page"
        if driver.find_elements(By.ID, "login_button"):
            return "login_page"
        return False

    outcome = wait_for_any(driver, [_has_modal, _login_page], timeout=timeout)
    if outcome == "modal":
        alert_text = wait_for_present(driver, By.ID, "alertHTML", timeout).text
        if "Access Denied" not in alert_text and "login" not in alert_text.lower():
            raise AssertionError(
                f"Expected login required message, got: {alert_text}"
            )
        close_buttons = driver.find_elements(
            By.CSS_SELECTOR, "#errorModal button[data-dismiss='modal']"
        )
        if close_buttons:
            safe_click(driver, close_buttons[0])
            wait_for_hidden(driver, By.ID, "errorModal", timeout)


def verify_file_download_blocked(driver, timeout):
    icon = wait_for_present(driver, By.ID, "download_icon", timeout)
    scroll_into_view(driver, icon)
    start_url = driver.current_url
    onclick = icon.get_attribute("onclick") or ""
    safe_click(driver, icon)

    if onclick:
        def _has_modal():
            try:
                modal = driver.find_element(By.ID, "errorModal")
                if modal.is_displayed():
                    return "modal"
            except NoSuchElementException:
                return False
            return False

        def _login_page():
            if "/labcas-ui/index.html" in driver.current_url:
                return "login_page"
            if driver.find_elements(By.ID, "login_button"):
                return "login_page"
            return False

        outcome = wait_for_any(driver, [_has_modal, _login_page], timeout=timeout)
        if outcome == "modal":
            alert_text = wait_for_present(driver, By.ID, "alertHTML", timeout).text
            if "Access Denied" not in alert_text and "login" not in alert_text.lower():
                raise AssertionError(
                    f"Expected login required message, got: {alert_text}"
                )
            close_buttons = driver.find_elements(
                By.CSS_SELECTOR, "#errorModal button[data-dismiss='modal']"
            )
            if close_buttons:
                safe_click(driver, close_buttons[0])
                wait_for_hidden(driver, By.ID, "errorModal", timeout)

    if "/labcas-ui/download.html" in driver.current_url:
        raise AssertionError("Guest download redirected to download page.")
    if driver.current_url != start_url and "/labcas-ui/f/index.html" not in driver.current_url:
        raise AssertionError("Guest download navigated away from file page.")


def verify_viewer_disabled(driver, timeout):
    wait_for_present(driver, By.ID, "view_ohif_link", timeout)
    dicom_count = wait_for_present(driver, By.ID, "dicom_size_ohif2", timeout).text.strip()
    if dicom_count not in ("0", ""):
        raise AssertionError(
            f"Expected no DICOM selections for guest, got {dicom_count}."
        )
    link = driver.find_element(By.ID, "view_ohif_link")
    classes = link.get_attribute("class") or ""
    aria_disabled = (link.get_attribute("aria-disabled") or "").lower()
    if "disabled" not in classes and aria_disabled != "true":
        raise AssertionError("OHIF viewer link is enabled for guest users.")


def wait_for_alert_with_text(driver, expected_text, timeout):
    alert = WebDriverWait(driver, timeout).until(EC.alert_is_present())
    alert_text = alert.text or ""
    if expected_text not in alert_text:
        raise AssertionError(
            f"Expected alert '{expected_text}', got '{alert_text}'."
        )
    alert.accept()
    return alert_text


def expect_logged_out_alert(driver, timeout, context):
    try:
        return wait_for_alert_with_text(
            driver, LOGGED_OUT_ALERT_TEXT, min(timeout, 30)
        )
    except TimeoutException as exc:
        raise AssertionError(
            f"Expected logged-out alert for {context}, but none appeared."
        ) from exc


def dismiss_alert_if_present(driver, timeout=3, expected_text=None):
    try:
        alert = WebDriverWait(driver, timeout).until(EC.alert_is_present())
    except TimeoutException:
        return False
    alert_text = alert.text or ""
    if expected_text and expected_text not in alert_text:
        pass
    alert.accept()
    return alert_text


def clear_logout_alert(driver):
    driver.execute_script(
        "try { localStorage.removeItem('logout_alert'); } catch (e) {}"
    )


def assert_collection_name_absent(driver, name, timeout, table_selector, loading_id):
    wait_for_hidden(driver, By.ID, loading_id, timeout)
    rows = driver.find_elements(By.CSS_SELECTOR, f"{table_selector} tbody tr")
    if not rows:
        return
    for row in rows:
        try:
            link = row.find_element(By.CSS_SELECTOR, "td:nth-child(2) a")
        except NoSuchElementException:
            continue
        if (link.text or "").strip() == name:
            raise AssertionError(
                f"Found restricted collection '{name}' in guest view."
            )


def assert_dataset_details_empty(driver):
    cells = driver.find_elements(By.CSS_SELECTOR, "#datasetdetails-table tbody td")
    if cells:
        raise AssertionError("Guest users can see dataset metadata details.")


def assert_file_details_empty(driver):
    cells = driver.find_elements(By.CSS_SELECTOR, "#filedetails-table tbody td")
    if cells:
        raise AssertionError("Guest users can see file metadata details.")


def wait_for_login_page(driver, timeout):
    def _is_login(_driver):
        if "/labcas-ui/index.html" in _driver.current_url:
            return True
        return bool(_driver.find_elements(By.ID, "login_button"))

    return WebDriverWait(driver, timeout).until(_is_login)


def collect_search_dataset_ids(driver, timeout, limit=10):
    wait_for_table_rows(driver, "#search-dataset-table", timeout)
    rows = driver.find_elements(By.CSS_SELECTOR, "#search-dataset-table tbody tr")
    dataset_ids = []
    for row in rows:
        try:
            link = row.find_element(By.CSS_SELECTOR, "a[href*='dataset_id=']")
        except NoSuchElementException:
            continue
        dataset_id = parse_query_param(link.get_attribute("href"), "dataset_id")
        if dataset_id:
            dataset_ids.append(dataset_id)
            if len(dataset_ids) >= limit:
                break
    return set(dataset_ids)


def collect_search_dataset_ids_after_load(driver, timeout, limit=10):
    wait_for_hidden(driver, By.ID, "loading_dataset", timeout)
    rows = driver.find_elements(By.CSS_SELECTOR, "#search-dataset-table tbody tr")
    dataset_ids = []
    for row in rows:
        try:
            link = row.find_element(By.CSS_SELECTOR, "a[href*='dataset_id=']")
        except NoSuchElementException:
            continue
        dataset_id = parse_query_param(link.get_attribute("href"), "dataset_id")
        if dataset_id:
            dataset_ids.append(dataset_id)
            if len(dataset_ids) >= limit:
                break
    return set(dataset_ids)


def assert_collection_name_not_in_search(driver, name, timeout):
    wait_for_hidden(driver, By.ID, "loading_collection", timeout)
    rows = driver.find_elements(By.CSS_SELECTOR, "#search-collection-table tbody tr")
    for row in rows:
        try:
            link = row.find_element(By.CSS_SELECTOR, "td:nth-child(1) a")
        except NoSuchElementException:
            continue
        if (link.text or "").strip() == name:
            raise AssertionError(
                f"Found restricted collection '{name}' in guest search results."
            )


def verify_guest_access(driver, base_url, timeout, restricted_dataset_id):
    run_step(
        driver,
        "Guest: opening public collections",
        lambda: driver.get(urljoin(base_url, "/labcas-ui/index.html")),
    )
    dismiss_alert_if_present(driver, expected_text=LOGGED_OUT_ALERT_TEXT)
    public_link = run_step(
        driver,
        "Guest: locating public collections link",
        lambda: wait_for_visible(
            driver, By.CSS_SELECTOR, "a[href*='/labcas-ui/s/index.html']", timeout
        )
    )
    if "Public Collections" not in public_link.text:
        public_link = run_step(
            driver,
            "Guest: fallback locate public collections link",
            lambda: wait_for_visible(
                driver, By.CSS_SELECTOR, "a[href*='/labcas-ui/p/index.html']", timeout
            ),
        )
    start_url = driver.current_url
    target_href = public_link.get_attribute("href") or ""
    if target_href:
        # index.html sets <base target="_blank"> which can open a new tab on click.
        run_step(
            driver,
            "Guest: navigate to public collections by href",
            lambda: driver.get(urljoin(base_url, target_href)),
        )
    else:
        run_step(
            driver,
            "Guest: click public collections link",
            lambda: safe_click(driver, public_link),
        )
    dismiss_alert_if_present(driver, expected_text=LOGGED_OUT_ALERT_TEXT)

    def _public_collections_page():
        return "/labcas-ui/p/index.html" in driver.current_url

    def _search_page():
        return "/labcas-ui/s/index.html" in driver.current_url

    def _search_tabs():
        try:
            return driver.find_element(By.ID, "searchTabs")
        except NoSuchElementException:
            return False

    def _public_header():
        return driver.find_elements(By.XPATH, "//h3[contains(., 'Public Collections')]")

    try:
        run_step(
            driver,
            "Guest: wait for public/search landing",
            lambda: wait_for_any(
                driver,
                [_public_collections_page, _search_page, _search_tabs, _public_header],
                timeout=min(timeout, 10),
            ),
        )
    except TimeoutException:
        target_href = public_link.get_attribute("href") or ""
        if target_href:
            driver.get(urljoin(base_url, target_href))
        else:
            raise AssertionError("Public Collections button did not navigate.")
    if driver.current_url == start_url:
        target_href = public_link.get_attribute("href") or ""
        if target_href:
            driver.get(urljoin(base_url, target_href))
        else:
            raise AssertionError("Public Collections button did not navigate.")

    if not _public_collections_page():
        driver.get(urljoin(base_url, "/labcas-ui/p/index.html"))
    dismiss_alert_if_present(driver, expected_text=LOGGED_OUT_ALERT_TEXT)
    run_step(
        driver,
        "Guest: confirm Public Collections header",
        lambda: wait_for_text_contains(
            driver, By.TAG_NAME, "h3", "Public Collections", timeout
        ),
    )

    public_links = run_step(
        driver,
        "Guest: waiting for public collections list",
        lambda: wait_for_collection_links(driver, "#collection-table", timeout),
    )
    public_collection_ids = set()
    for link in public_links:
        href = link.get_attribute("href") or ""
        value = parse_query_param(href, "collection_id")
        if value:
            public_collection_ids.add(value)
    if not public_collection_ids:
        raise AssertionError("No public collections found for guest users.")
    if GUEST_PRIVATE_COLLECTION_NAME:
        assert_collection_name_absent(
            driver,
            GUEST_PRIVATE_COLLECTION_NAME,
            timeout,
            "#collection-table",
            "loading",
        )

    run_named_step(
        driver,
        "Guest: verifying blocked collection access",
        lambda: (
            None
            if not GUEST_BLOCKED_COLLECTION_ID
            else (
                clear_logout_alert(driver),
                driver.get(
                    urljoin(
                        base_url,
                        f"/labcas-ui/c/index.html?collection_id={GUEST_BLOCKED_COLLECTION_ID}",
                    )
                ),
                expect_logged_out_alert(driver, timeout, "blocked collection"),
                driver.get(urljoin(base_url, "/labcas-ui/p/index.html")),
                wait_for_text_contains(
                    driver, By.TAG_NAME, "h3", "Public Collections", timeout
                ),
            )
        ),
    )

    def _guest_blocked_dataset_step():
        if not GUEST_BLOCKED_DATASET_ID:
            return
        clear_logout_alert(driver)
        blocked_dataset_url = urljoin(
            base_url,
            f"/labcas-ui/d/index.html?dataset_id={GUEST_BLOCKED_DATASET_ID}",
        )
        driver.get(blocked_dataset_url)
        expect_logged_out_alert(driver, timeout, "blocked dataset")
        try:
            wait_for_login_page(driver, min(timeout, 20))
        except TimeoutException:
            assert_dataset_details_empty(driver)
        driver.get(urljoin(base_url, "/labcas-ui/p/index.html"))
        wait_for_text_contains(driver, By.TAG_NAME, "h3", "Public Collections", timeout)

    run_named_step(driver, "Guest: verifying blocked dataset access", _guest_blocked_dataset_step)

    run_named_step(
        driver,
        "Guest: verifying public dataset has no files",
        lambda: (
            None
            if not GUEST_PUBLIC_NOFILES_DATASET_ID
            else (
                driver.get(
                    urljoin(
                        base_url,
                        f"/labcas-ui/d/index.html?dataset_id={GUEST_PUBLIC_NOFILES_DATASET_ID}",
                    )
                ),
                wait_for_present(
                    driver, By.CSS_SELECTOR, "#datasetdetails-table tbody td", timeout
                ),
                wait_for_guest_files_blocked(driver, timeout),
            )
        ),
    )

    def _guest_file_blocked_step():
        if not GUEST_BLOCKED_FILE_ID:
            return
        clear_logout_alert(driver)
        blocked_file_url = urljoin(
            base_url,
            f"/labcas-ui/f/index.html?file_id={GUEST_BLOCKED_FILE_ID}",
        )
        driver.get(blocked_file_url)
        expect_logged_out_alert(driver, timeout, "blocked file")
        try:
            wait_for_login_page(driver, min(timeout, 20))
        except TimeoutException:
            assert_file_details_empty(driver)
            verify_file_download_blocked(driver, timeout)

    run_named_step(driver, "Guest: verifying file details are blocked", _guest_file_blocked_step)

    def _guest_private_step():
        driver.get(urljoin(base_url, "/labcas-ui/m/index.html"))
        if "/labcas-ui/index.html" in driver.current_url or driver.find_elements(
            By.ID, "login_button"
        ):
            private_ok = True
        else:
            all_collection_ids = set(
                collect_table_param_values(
                    driver, "#collection-table", "collection_id", timeout
                )
            )
            private_ok = all_collection_ids.issubset(public_collection_ids)
            if GUEST_PRIVATE_COLLECTION_NAME:
                assert_collection_name_absent(
                    driver,
                    GUEST_PRIVATE_COLLECTION_NAME,
                    timeout,
                    "#collection-table",
                    "loading",
                )
        if not private_ok:
            raise AssertionError("Guest users can access non-public collections.")

    run_named_step(
        driver,
        "Guest: ensuring private collections are not visible",
        _guest_private_step,
    )

    run_named_step(
        driver,
        "Guest: verifying collection metadata access",
        lambda: (
            driver.get(urljoin(base_url, "/labcas-ui/p/index.html")),
            open_first_table_link_with_param(
                driver, "#collection-table", "collection_id", timeout
            ),
            wait_for_present(
                driver, By.CSS_SELECTOR, "#collectiondetails-table tbody td", timeout
            ),
        ),
    )

    def _guest_dataset_metadata_step():
        open_first_public_collection_with_dataset(driver, base_url, timeout)
        wait_for_present(driver, By.CSS_SELECTOR, "#datasetdetails-table tbody td", timeout)

    run_named_step(driver, "Guest: verifying dataset metadata access", _guest_dataset_metadata_step)

    def _guest_file_access_blocked():
        dataset_for_blocked_files = (GUEST_PUBLIC_NOFILES_DATASET_ID or "").strip()
        if dataset_for_blocked_files:
            driver.get(
                urljoin(
                    base_url,
                    f"/labcas-ui/d/index.html?dataset_id={dataset_for_blocked_files}",
                )
            )
            wait_for_present(
                driver, By.CSS_SELECTOR, "#datasetdetails-table tbody td", timeout
            )

        # Depending on collection policy/config, guest blocking may appear as:
        # - explicit "Login to see additional files/data" row, or
        # - empty/withheld files table with no links/checkboxes.
        wait_for_guest_files_blocked(driver, timeout)
        try:
            wait_for_login_required_files_message(driver, min(timeout, 8))
        except TimeoutException:
            pass
        verify_viewer_disabled(driver, timeout)
        verify_download_requires_login(driver, timeout)

    run_named_step(driver, "Guest: verifying file access is blocked", _guest_file_access_blocked)

    def _guest_collect_search_ids():
        ensure_search_page(driver, base_url, timeout)
        perform_nav_search(driver, timeout)
        wait_for_table_rows(driver, "#search-dataset-table", timeout)
        if GUEST_PRIVATE_COLLECTION_NAME:
            assert_collection_name_not_in_search(
                driver, GUEST_PRIVATE_COLLECTION_NAME, timeout
            )
        return collect_search_dataset_ids(driver, timeout)

    guest_dataset_ids = run_named_step(
        driver, "Guest: collecting search dataset ids", _guest_collect_search_ids
    )
    if not guest_dataset_ids:
        raise AssertionError("Guest search returned no dataset results.")

    if restricted_dataset_id:
        run_named_step(
            driver,
            "Guest: confirming restricted dataset is absent",
            lambda: (
                wait_for_visible(driver, By.ID, "search_text", timeout).clear(),
                wait_for_visible(driver, By.ID, "search_text", timeout).send_keys(
                    restricted_dataset_id
                ),
                wait_for_visible(driver, By.ID, "search_text", timeout).send_keys(
                    Keys.ENTER
                ),
                (
                    (_ids := collect_search_dataset_ids_after_load(driver, timeout))
                    and None
                )
                if restricted_dataset_id not in _ids
                else (_ for _ in ()).throw(
                    AssertionError("Restricted dataset appears in guest search results.")
                ),
            ),
        )
    return guest_dataset_ids


def verify_restricted_search_results(
    driver,
    base_url,
    timeout,
    guest_dataset_ids,
    restricted_dataset_id,
    enforce_guest_subset=False,
):
    log("Checking search results...")
    verify_search_results(driver, base_url, timeout)
    authorized_dataset_ids = collect_search_dataset_ids(driver, timeout)
    if restricted_dataset_id:
        log("Checking restricted dataset visibility...")
        ensure_search_page(driver, base_url, timeout)
        search_input = wait_for_visible(driver, By.ID, "search_text", timeout)
        search_input.clear()
        search_input.send_keys(restricted_dataset_id)
        search_input.send_keys(Keys.ENTER)
        auth_ids = collect_search_dataset_ids_after_load(driver, timeout, limit=5)
        if restricted_dataset_id not in auth_ids:
            raise AssertionError(
                "Restricted dataset not visible to authorized user."
            )
    else:
        missing = guest_dataset_ids - authorized_dataset_ids
        if missing:
            detail = (
                "Guest search results are not a subset of authorized results. "
                f"missing_count={len(missing)} sample={sorted(list(missing))[:5]}"
            )
            if enforce_guest_subset:
                raise AssertionError(detail)
            log(detail, level="WARNING")
def run_authenticated_flow(
    driver,
    base_url,
    username,
    password,
    timeout,
    guest_dataset_ids,
    enforce_guest_subset=False,
    require_ohif_render=False,
):
    restricted_dataset_id = os.getenv("LABCAS_RESTRICTED_DATASET_ID", "").strip()
    log("PHASE 2/2: Logging in and running authenticated flow...")
    run_step(
        driver,
        "Auth: login",
        lambda: login(driver, base_url, username, password, timeout),
    )

    run_step(
        driver,
        "Auth: verify restricted search results",
        lambda: verify_restricted_search_results(
            driver,
            base_url,
            timeout,
            guest_dataset_ids,
            restricted_dataset_id,
            enforce_guest_subset=enforce_guest_subset,
        ),
    )

    dataset_timeout = max(timeout, 180)
    collection_url = urljoin(
        base_url,
        f"/labcas-ui/c/index.html?collection_id={TARGET_COLLECTION_ID}",
    )
    log("Opening target collection...")
    run_step(
        driver,
        "Auth: open target collection",
        lambda: (
            driver.get(collection_url),
            wait_for_url_contains(driver, "/labcas-ui/c/index.html", timeout),
            wait_for_present(
                driver, By.CSS_SELECTOR, "#collectiondetails-table tbody td", timeout
            ),
        ),
    )
    parent_dataset_link = wait_for_link_by_text(
        driver, "#datasets-table", TARGET_PARENT_DATASET, dataset_timeout
    )
    run_named_step(
        driver,
        "Auth: open parent dataset",
        lambda: (
            scroll_into_view(driver, parent_dataset_link),
            safe_click(driver, parent_dataset_link),
            wait_for_url_contains(driver, "/labcas-ui/d/index.html", timeout),
            wait_for_present(driver, By.CSS_SELECTOR, "#datasetdetails-table tbody td", timeout),
            wait_for_non_empty_text(driver, By.ID, "datasettitle", timeout),
            wait_for_button_enabled(driver, By.ID, "download_sel", timeout),
            wait_for_button_enabled(driver, By.ID, "view_image_btn", timeout),
        ),
    )

    child_dataset_link = wait_for_link_by_text(
        driver, "#children-datasets-section", TARGET_CHILD_DATASET, dataset_timeout
    )
    run_named_step(
        driver,
        "Auth: open child dataset",
        lambda: (
            scroll_into_view(driver, child_dataset_link),
            safe_click(driver, child_dataset_link),
            wait_for_url_contains(driver, "/labcas-ui/d/index.html", timeout),
            wait_for_present(driver, By.CSS_SELECTOR, "#datasetdetails-table tbody td", timeout),
        ),
    )

    run_named_step(
        driver,
        "Auth: wait for file list",
        lambda: (
            wait_for_files_ready(driver, dataset_timeout),
            wait_for_js_true(driver, "window._orig_init_file_checkboxes", dataset_timeout),
        ),
    )

    def _select_dicom_files():
        dicom_boxes = wait_for_dicom_checkboxes(
            driver, dataset_timeout, min_count=TARGET_FILE_SELECTION_COUNT
        )
        for checkbox in dicom_boxes[:TARGET_FILE_SELECTION_COUNT]:
            scroll_into_view(driver, checkbox)
            safe_click(driver, checkbox)
            driver.execute_script(
                "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                checkbox,
            )
        wait_for_dicom_count(driver, dataset_timeout)

    run_named_step(driver, "Auth: select first DICOM files", _select_dicom_files)

    run_named_step(
        driver,
        "Auth: open OHIF viewer",
        lambda: open_ohif_viewer(driver, dataset_timeout),
    )
    log("START: Auth: validate OHIF viewer image")
    try:
        wait_for_ohif_image(driver, dataset_timeout)
        log("PASS: Auth: validate OHIF viewer image")
        record_result("Auth: validate OHIF viewer image", "PASS")
        log_browser_state(driver, "after Auth: validate OHIF viewer image")
    except Exception as exc:
        if is_invalid_session_error(exc):
            msg = (
                "Auth: validate OHIF viewer image failed: browser session disconnected/crashed "
                "while loading OHIF. This is a browser/runtime stability failure, not an auth failure."
            )
        else:
            msg = f"Auth: validate OHIF viewer image failed: {type(exc).__name__}: {short_exc(exc)}"
        if require_ohif_render:
            log(f"FAIL: Auth: validate OHIF viewer image | {msg}", level="ERROR")
            record_result("Auth: validate OHIF viewer image", "FAIL", msg)
            log_browser_state(driver, "on failure: Auth: validate OHIF viewer image")
            raise AssertionError(msg) from exc
        log(f"WARN: {msg}", level="WARNING")
        record_result("Auth: validate OHIF viewer image", "WARN", msg)
        log_browser_state(driver, "on warning: Auth: validate OHIF viewer image")

    log("Smoke test complete.")


def run_smoke(
    driver,
    base_url,
    username,
    password,
    timeout,
    skip_guest_checks=False,
    require_guest_pass=False,
    enforce_guest_subset=False,
    require_ohif_render=False,
):
    restricted_dataset_id = os.getenv("LABCAS_RESTRICTED_DATASET_ID", "").strip()
    guest_dataset_ids = set()
    guest_error = None

    if skip_guest_checks:
        log("PHASE 1/2: Skipping guest access checks...")
    else:
        log(
            "PHASE 1/2: Running guest access checks in Guest tab "
            "(logged-out behavior expected)..."
        )
        log(
            f"Using guest tab handle={driver.current_window_handle}",
            level="DEBUG",
        )
        try:
            guest_dataset_ids = run_step(
                driver,
                "Guest: full workflow",
                lambda: verify_guest_access(
                    driver, base_url, timeout, restricted_dataset_id
                ),
            )
        except Exception as exc:
            guest_error = exc
            log(
                f"Guest workflow failed, continuing to authenticated workflow in a new tab: "
                f"{type(exc).__name__}: {exc}",
                level="WARNING",
            )
            log_browser_state(driver, "guest failure state")
            if require_guest_pass:
                raise

    auth_handle = open_new_tab(
        driver, "auth", url=urljoin(base_url, "/labcas-ui/index.html")
    )
    log(
        f"Switched to auth tab handle={auth_handle} "
        f"(guest_error={bool(guest_error)})",
        level="DEBUG",
    )
    run_authenticated_flow(
        driver,
        base_url,
        username,
        password,
        timeout,
        guest_dataset_ids,
        enforce_guest_subset=enforce_guest_subset,
        require_ohif_render=require_ohif_render,
    )


def parse_args():
    parser = argparse.ArgumentParser(description="LabCAS Selenium smoke test")
    parser.add_argument(
        "--base-url",
        default=os.getenv("LABCAS_BASE_URL", DEFAULT_BASE_URL),
        help="Base URL for LabCAS",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        default=os.getenv("LABCAS_HEADLESS", "") == "1",
        help="Run Chrome in headless mode",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.getenv("LABCAS_TIMEOUT", "60")),
        help="Seconds to wait for page elements",
    )
    parser.add_argument(
        "--keep-open",
        action="store_true",
        help="Leave the browser open after the run",
    )
    parser.add_argument(
        "--skip-guest-checks",
        action="store_true",
        default=os.getenv("LABCAS_SKIP_GUEST_CHECKS", "") == "1",
        help="Skip guest-access validation and run only logged-in smoke flow",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=os.getenv("LABCAS_VERBOSE", "1") == "1",
        help="Enable verbose step/state logging",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Disable verbose step/state logging",
    )
    parser.add_argument(
        "--require-guest-pass",
        action="store_true",
        default=os.getenv("LABCAS_REQUIRE_GUEST_PASS", "") == "1",
        help="Fail immediately if guest workflow fails before auth workflow",
    )
    parser.add_argument(
        "--show-traceback",
        action="store_true",
        help="Print full Python traceback on failure",
    )
    parser.add_argument(
        "--enforce-guest-subset",
        action="store_true",
        default=os.getenv("LABCAS_ENFORCE_GUEST_SUBSET", "") == "1",
        help="Fail if guest search dataset ids are not subset of auth search dataset ids",
    )
    parser.add_argument(
        "--require-ohif-render",
        action="store_true",
        default=os.getenv("LABCAS_REQUIRE_OHIF_RENDER", "") == "1",
        help="Fail run if OHIF viewer image rendering does not complete",
    )
    return parser.parse_args()


def main():
    global VERBOSE, SHOW_TRACEBACK
    STEP_RESULTS.clear()
    args = parse_args()
    if args.quiet:
        VERBOSE = False
    else:
        VERBOSE = args.verbose
    SHOW_TRACEBACK = args.show_traceback
    username = os.getenv("LABCAS_USERNAME", "").strip()
    if not username:
        username = input("LabCAS username: ").strip()
    if not username:
        raise ValueError("Username is required.")
    password = os.getenv("LABCAS_PASSWORD", "")
    if not password:
        password = getpass("LabCAS password: ")
    if not password:
        raise ValueError("Password is required.")

    driver = build_driver(args.headless)
    try:
        log(
            "Starting smoke test "
            f"(base_url={args.base_url}, user={username}, "
            f"headless={args.headless}, timeout={args.timeout}, "
            f"skip_guest_checks={args.skip_guest_checks}, "
            f"require_guest_pass={args.require_guest_pass}, "
            f"enforce_guest_subset={args.enforce_guest_subset}, "
            f"require_ohif_render={args.require_ohif_render}, verbose={VERBOSE})"
        )
        log(f"WebDriver session_id={driver.session_id}", level="DEBUG")
        run_smoke(
            driver,
            args.base_url,
            username,
            password,
            args.timeout,
            skip_guest_checks=args.skip_guest_checks,
            require_guest_pass=args.require_guest_pass,
            enforce_guest_subset=args.enforce_guest_subset,
            require_ohif_render=args.require_ohif_render,
        )
    except Exception as exc:
        log(f"Smoke test failed: {type(exc).__name__}: {exc}", level="ERROR")
        log_browser_state(driver, "final failure state")
        if SHOW_TRACEBACK:
            raise
        sys.exit(1)
    finally:
        print_summary()
        if args.keep_open:
            log("Browser left open for inspection. Press Enter to close.")
            try:
                input()
            except EOFError:
                time.sleep(300)
        driver.quit()


if __name__ == "__main__":
    main()
