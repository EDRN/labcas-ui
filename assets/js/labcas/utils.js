var user_data = {};
$().ready(function() {
	if(localStorage.getItem("userdata") && localStorage.getItem("userdata") != "None"){
		user_data = JSON.parse(localStorage.getItem("userdata"));
	}
	console.log(user_data);

	// Toggle plus minus icon on show hide of collapse element
	$(".collapse.show").each(function(){	
        	$(this).prev(".btn").find(".fa").addClass("fa-minus").removeClass("fa-plus");
        });
	$(".collapse").on('show.bs.collapse', function(){
        	$(this).prev(".btn").find(".fa").removeClass("fa-plus").addClass("fa-minus");
        }).on('hide.bs.collapse', function(){
        	$(this).prev(".btn").find(".fa").removeClass("fa-minus").addClass("fa-plus");
        });
});
function initCookies(){
	if(!Cookies.get("token") || Cookies.get("token") == "None"){
		$.ajax({
			  url: '/labcas-ui/assets/conf/environment.cfg?26',
			  dataType: 'json',
			  async: false,
			  success: function(json) {
			Cookies.set("user", "Sign in");
			$.each( json, function( key, val ) {
				localStorage.setItem(key, val);
			});
	
			user_data = {"FavoriteCollections":[],"FavoriteDatasets":[],"FavoriteFiles":[]};
			if(localStorage.getItem("userdata") && localStorage.getItem("userdata") != "None"){
				var data = localStorage.getItem("userdata");
			
				if (data['response'] && data['response']['docs'] && data['response']['docs'][0]){
					user_data = data['response']['docs'][0];
				}
			}
			if (!user_data["FavoriteCollections"]){
				user_data["FavoriteCollections"] = [];
			}
			if (!user_data["FavoriteDatasets"]){
				user_data["FavoriteDatasets"] = [];
			}
			if (!user_data["FavoriteFiles"]){
				user_data["FavoriteFiles"] = [];
			}
			console.log("userdata");
			console.log(user_data);
			localStorage.setItem("userdata",  JSON.stringify(user_data));
			Cookies.remove('JasonWebToken');
		        $('#login_logout').html('<i class="nc-icon nc-button-power"></i> Log in')
		        $('#login_logout').removeClass("text-danger");
		        $('#login_logout').addClass("text-success");
		}});
	}
}

function writeUserData(udata){
	$.ajax({
        url: localStorage.getItem('environment')+"/data-access-api/userdata/create",
        beforeSend: function(xhr) { 
            xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
        },
        type: 'POST',
        data: udata,
        contentType:"application/json",
        dataType: 'json',
        success: function (data) {
            //console.log(data);
            localStorage.setItem("userdata",  udata);
            window.location.reload();
        },
        error: function(){
             //alert("Login expired, please login...");
             //window.location.replace("/labcas-ui/application/pages/login.html");
         }
    });
    
}
function getUserData(){
	$.ajax({
		url: localStorage.getItem('environment')+"/data-access-api/userdata/read?id="+Cookies.get('user'),
		beforeSend: function(xhr) { 
			xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
		},
		type: 'GET',
		dataType: 'json',
		success: function (data) {
			user_data_tmp = {}
			if (data['response']){
				user_data_tmp = data['response']['docs'][0];
			}
			if (!user_data_tmp["FavoriteCollections"]){
				user_data_tmp["FavoriteCollections"] = [];
			}
			if (!user_data_tmp["FavoriteDatasets"]){
				user_data_tmp["FavoriteDatasets"] = [];
			}
			if (!user_data_tmp["FavoriteFiles"]){
				user_data_tmp["FavoriteFiles"] = [];
			}
			localStorage.setItem("userdata",  JSON.stringify(user_data_tmp));
		},
		error: function(){
			 //alert("Login expired, please login...");
			 //window.location.replace("/labcas-ui/application/pages/login.html");
		 }
	});
}
function query_labcas_api(url, customfunction){
        $.ajax({
                url: url,
                beforeSend: function(xhr) {
                        if(Cookies.get('token') && Cookies.get('token') != "None"){
                                xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token'));
                        }
                },
                type: 'GET',
                dataType: 'json',
                processData: false,
                success: function (data) {
                        customfunction(data);
                },
                error: function(e){
                        if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                                   localStorage.setItem("logout_alert","On");
                                 alert(formatTimeOfDay($.now()) + ": Login expired, please login...");
                        }
                        window.location.replace("/labcas-ui/index.html");
                 }
        });


}
function save_favorite(labcas_id, labcas_type){
	var user_id = Cookies.get('user');
	$.ajax({
        url: localStorage.getItem('environment')+"/data-access-api/userdata/read?id="+user_id,
        beforeSend: function(xhr) { 
            xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
        },
        type: 'GET',
        dataType: 'json',
        success: function (data) {
			var user_data_tmp = data;
			//console.log(user_data_tmp);
			var user_collection = [];
			if (user_data_tmp['response'] && user_data_tmp['response']['docs'][0]){
				user_data_tmp = user_data_tmp['response']['docs'][0];
				if (user_data_tmp["_version_"]){
					delete user_data_tmp["_version_"];
				}
			}else{
				user_data_tmp = {"id":user_id};
			}
			
			if (user_data_tmp[labcas_type]){
				user_collection = user_data_tmp[labcas_type];
			}
			
			if (user_collection.includes(labcas_id)){
				user_collection.splice(user_collection.indexOf(labcas_id), 1);
			}else{
				user_collection.push(labcas_id);
				user_data_tmp[labcas_type] = user_collection;
			}
			if (!user_data_tmp["FavoriteCollections"]){
				user_data_tmp["FavoriteCollections"] = [];
			}
			if (!user_data_tmp["FavoriteDatasets"]){
				user_data_tmp["FavoriteDatasets"] = [];
			}
			if (!user_data_tmp["FavoriteFiles"]){
				user_data_tmp["FavoriteFiles"] = [];
			}
			writeUserData(JSON.stringify(user_data_tmp));
		},
        error: function(){
             //alert("Login expired, please login...");
             //window.location.replace("/labcas-ui/application/pages/login.html");
         }
    });
}

function dataset_compare_sort(a, b) {
  const idA = a.id.toUpperCase();
  const idB = b.id.toUpperCase();

  var comparison = 0;
  if (idA > idB) {
    comparison = 1;
  } else if (idA < idB) {
    comparison = -1;
  }
  return comparison;
}

function generate_mcl_links(obj){
	var institutions = [];
	var protocols = [];
	var pis = [];
	var orgs = [];
	if (obj.Institution){
		for (var i = 0; i < obj.Institution.length; i++) {
			o = $.trim(obj.Institution[i]);
			if (o != ""){
				inst_url = o.replace(/\./g,"").replace(/\(/g,"").replace(/\)/g,"").replace(/ - /g," ").toLowerCase().replace(/ /g,"-");
			}	
			
			leadpi = $.trim(obj.LeadPI[i]).toLowerCase().split(" ");
			if (obj.LeadPI[i].includes("+")){
				leadpi = $.trim(obj.LeadPI[i]).toLowerCase().split("+");
			}
			pis.push("<a href='"+localStorage.getItem('leadpi_url')+leadpi[1]+"-"+leadpi[0]+"'>"+obj.LeadPI[i]+"</a>");
			institutions.push("<a href='"+localStorage.getItem('institution_url')+inst_url+"'>"+o+"</a>");
			
		}
	}
	if (obj.ProtocolName){
                for (var i = 0; i < obj.ProtocolName.length; i++) {
                        o = $.trim(obj.ProtocolName[i]);
                        if (o != ""){
                                inst_url = o.replace(/\./g,"-").replace(/\(/g,"-").replace(/\)/g,"-").replace(/ - /g,"-").replace(/:/g,"-").replace(/,/g,"-").replace(/\//g,"-").toLowerCase().replace(/ /g,"-");
     				while (inst_url.includes("--") || inst_url.startsWith("-") || inst_url.endsWith("-")){
					inst_url = inst_url.replace(/--/g,"-");
					inst_url = inst_url.trim("-");
				}
                        }
                        protocols.push("<a href='"+localStorage.getItem('protocol_url')+inst_url+"'>"+o+"</a>");

                }
        }
	if (obj.Organ){
		for (var i = 0; i < obj.Organ.length; i++) {
			o = $.trim(obj.Organ[i]);
			if (o != ""){
				orgs.push("<a href='"+localStorage.getItem('organ_url')+o.toLowerCase()+"'>"+o+"</a>");
			}
		}
	}
	return [institutions, pis, orgs, protocols];
}

function generate_edrn_links(obj){
	var institutions = [];
	var protocols = [];
	var pis = [];
	var orgs = [];
	if (obj.Institution){
		for (var i = 0; i < obj.Institution.length; i++) {
			o = $.trim(obj.Institution[i]);
			if (o != "" && obj.InstitutionId && obj.InstitutionId[i] && $.trim(obj.InstitutionId[i]) != ""){
				inst_split = o.replace(".","").toLowerCase().split(" ");
				inst_url = $.trim(obj.InstitutionId[i]);
				for (var c = 0; c < inst_split.length; c++) {
					if (!inst_split[c]){
						continue;
					}
					if ((inst_url.length+$.trim(inst_split[c]).length+1) > 50){
						break;
					}

					inst_url += "-"+$.trim(inst_split[c]);
				}
				
				leadpi = $.trim(obj.LeadPI[i]).toLowerCase().split(" ");
				if (obj.LeadPI[i] && obj.LeadPI[i].includes("+")){
					leadpi = $.trim(obj.LeadPI[i]).toLowerCase().split("+");
				}
				pis.push("<a href='"+localStorage.getItem('institution_url')+inst_url+"/"+leadpi[1]+"-"+leadpi[0]+"'>"+obj.LeadPI[i]+"</a>");
				institutions.push("<a href='"+localStorage.getItem('institution_url')+inst_url+"'>"+o+"</a>");
			
			}
		}
	}
	if (obj.ProtocolName){
		for (var i = 0; i < obj.ProtocolName.length; i++) {
			o = $.trim(obj.ProtocolName[i]);
			//console.log((inst_url.length+$.trim(inst_split[c]).length+1));
			if (o != "" && o != "Unknown"){
				inst_url_clean = o.replace(/\./g,"-").replace(/'/g,"-").replace(/&/,"-").replace(/;/,"-").replace(/#/,"-").replace(/\(/g,"-").replace(/\)/g,"-").replace(/ - /g,"-").replace(/:/g,"-").replace(/,/g,"-").replace(/\//g,"-").toLowerCase().replace(/ /g,"-");

				inst_split = inst_url_clean.toLowerCase().split("-");

				inst_url = $.trim(obj.ProtocolId[i]);
				if (o == "No Associated Protocol"){
					inst_url = o;
					protocols.push(o);
				}else{
					for (var c = 0; c < inst_split.length; c++) {
						if (!inst_split[c]){
							continue;
						}
						if ((inst_url.length+$.trim(inst_split[c]).length+1) > 50){
							break;
						}
						inst_url += "-"+$.trim(inst_split[c]);
					}
					protocols.push("<a href='"+localStorage.getItem('protocol_url')+inst_url+"'>"+o+"</a>");
				}
			}
		}
	}
	
	if (obj.Organ){
		for (var i = 0; i < obj.Organ.length; i++) {
			o = $.trim(obj.Organ[i]);
			if (o != ""){
				orgs.push("<a href='"+localStorage.getItem('organ_url')+o+"'>"+o+"</a>");
			}
		}
	}
	return [institutions, pis, orgs, protocols];
}


function get_url_vars(){
    var $_GET = {};

    document.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function () {
        function decode(s) {
            return decodeURIComponent(s.split("+").join(" "));
        }
        $_GET[decode(arguments[1])] = decode(arguments[2]);
    });
    return $_GET;
}

function load_pagination(divid, size, cpage){
	$('#'+divid+"_pagination_top").empty();
	$('#'+divid+"_pagination_bottom").empty();
	var lowerbound = 1;
	var fastbackward = 1;
	var upperbound = Math.ceil(size / 10);
	var fastforward = Math.ceil(size / 10);
	cpage = Math.floor(cpage / 10);
	if (cpage - 5 > lowerbound){
		lowerbound = cpage - 5;
	}
	if (cpage + 5 < upperbound){
		upperbound = cpage + 5;
	}
	if (cpage - 20 > fastbackward){
		fastbackward = cpage - 20;
	}
	if (cpage + 20 < fastforward){
		fastforward = cpage + 20;
	}
	$('#'+divid+"_pagination_top").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+fastbackward+');">«</a></li>');
	$('#'+divid+"_pagination_bottom").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+fastbackward+');">«</a></li>');
	for(var idx=lowerbound;idx<upperbound+1;idx++){
		if (parseInt(idx) == parseInt(cpage)+1){
			$('#'+divid+"_pagination_top").append('<li class="page-item active"><a class="page-link" onclick="paginate(\''+divid+'\','+idx+');">'+idx+'</a></li>');
			$('#'+divid+"_pagination_bottom").append('<li class="page-item active"><a class="page-link" onclick="paginate(\''+divid+'\','+idx+');">'+idx+'</a></li>');
		}else{
			$('#'+divid+"_pagination_top").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+idx+');">'+idx+'</a></li>');
			$('#'+divid+"_pagination_bottom").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+idx+');">'+idx+'</a></li>');
		}
	}
	$('#'+divid+"_pagination_top").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+fastforward+');">»</a></li>');
	$('#'+divid+"_pagination_bottom").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+fastforward+');">»</a></li>');
}

function paginate(divid, cpage){
	var get_var = get_url_vars();
	if (divid == 'files'){
		setup_labcas_dataset_data("datasetfiles",'id:"'+get_var["dataset_id"]+'"', 'DatasetId:"'+get_var["dataset_id"]+'"', cpage-1); 
	}else if (divid == 'collections_search' || divid == 'datasets_search' || divid == 'files_search'){
		setup_labcas_search(get_var["search"], divid, cpage-1);
	}
}
function escapeRegExp(string) {
      return string.replace(/[\.\*\?\^\$\{\}\(\)\|\[\]\\~&!": ]/g, '\\$&'); // $& means the whole matched string
}

function formatTimeOfDay(millisSinceEpoch) {
  var secondsSinceEpoch = (millisSinceEpoch / 1000) | 0;
  var secondsInDay = ((secondsSinceEpoch % 86400) + 86400) % 86400;
  var seconds = secondsInDay % 60;
  var minutes = ((secondsInDay / 60) | 0) % 60;
  var hours = (secondsInDay / 3600) | 0;
  return hours + (minutes < 10 ? ":0" : ":")
      + minutes + (seconds < 10 ? ":0" : ":")
      + seconds;
}
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}
function wait(ms) {
    var start = Date.now(),
        now = start;
    while (now - start < ms) {
      now = Date.now();
    }
}


function checkWindow(win){

	if(!win || win.closed || typeof win.closed=='undefined') 
	{ 
		// Internet Explorer 6-11
		var isIE = /*@cc_on!@*/false || !!document.documentMode;

		var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));
		var isFirefox = typeof InstallTrigger !== 'undefined';
		var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
		var isEdge = window.navigator.userAgent.indexOf("Edge") > -1;


		if( isChrome ){
			if ( isMacintosh() ){
				$('#alertHTML').html("Download blocked. To fix this for Chrome:<br>The path required is \"Chrome\" → Preferences → Privacy and security → <br>Site Settings → Content, Pop-ups and redirects → Allow, Add:<br>"+window.location.hostname);
			}
			if ( isWindows() ){
				$('#alertHTML').html("Download blocked. To fix this for Chrome:<br>The path required is (⋮) → Settings → Privacy and security → <br>Site Settings → Content, Pop-ups and redirects → Allow, Add:<br>"+window.location.hostname);
			}
	
			if ( isEdge ){
				$('#alertHTML').html("Download blocked. To fix this for Chrome:<br>The path is \"⋯\" → Settings → Privacy and security → Pop-ups and redirects → Allow, add, "+window.location.hostname+", Add");
			}
		}else if ( isSafari ){
			$('#alertHTML').html("Download blocked. To fix this for Safari:<br>The path is \"Safari\" → Preferences → Websites → Pop-up Windows → "+window.location.hostname+" → Drop-down menu, \"Allow\"");
		}else if ( isFirefox ){
			if ( isMacintosh() ){
				$('#alertHTML').html("Download blocked. To fix this for Firefox:<br>The path is \"Firefox\" → Preferences → Privacy & Security → Block pop-up windows, \"Exceptions…\" → add "+window.location.hostname+", \"Allow\", Save Changes.: ");
			}if ( isWindows() ){
				$('#alertHTML').html("Download blocked. To fix this for Firefox:<br>The path is (☰) → Options → Privacy & Security → Block pop-up windows, \"Exceptions…\" → add "+window.location.hostname+", \"Allow\", Save Changes.: ");
			}
		}else if ( isIE ){
			$('#alertHTML').html("Download blocked. Please fix this for Internet Explorer.");
		}else{
			$('#alertHTML').html("Download blocked. Please fix this for your respective browser.");
		}
		$('#errorModal').modal({backdrop: 'static', keyboard: false});
		$('#errorModal').modal('show');
		return "popup_blocked";
	}
	return "worked";
}

function checkSize(filecount, filesize, threshold){
	$('#sizeHTML').html("There are <B><font color='red'>"+filecount+"</font></B> files with total size of <B><font color='red'>"+filesize+"</font></B>. This is more than the <B><font color='red'>"+threshold+"</font></B> recommended download size from a web browser. If you'd like to proceed, the browser will initiate a series of downloads, please keep your browser and internet connection open for the duration of the download. Alternatively, you may download the below script that can be run through your command prompt/terminal instead with minimal interferance.");
	$('#sizeModal').modal({backdrop: 'static', keyboard: false});
	$('#sizeModal').modal('show');
}

function resume_download(){
	localStorage.setItem('download_size',0);
	window.location.replace("/labcas-ui/download.html");
}

function download_file(val, type){
	var dataurl = localStorage.getItem('environment')+"/data-access-api/download?id="+val;
	console.log(dataurl);
	if (UrlExists(dataurl)){
		if (type == "multiple"){
			win = window.open(dataurl, '_blank');
			outcome = checkWindow(win);
			return outcome;
		}else{
			location.href = dataurl;
		}
	}else{
		alert("Error! The following file not available for download:\n"+decodeURI(val).replace(/\\/g,'')+'\n\nPlease reach out to ic-portal@jpl.nasa.gov.');
	}
	
}
function download_files(formname){
    var download_list = [];
    var download_size = 0;
    $('#' + formname + ' input[type="checkbox"]').each(function() {
        if ($(this).is(":checked")) {
            download_list.push($(this).val());
	    download_size += parseInt(this.getAttribute("data-valuesize"));
        }
    });
    var get_var = get_url_vars();
    if (get_var["dataset_id"] && get_var["dataset_id"] != "undefined"){
	    Cookies.set("login_redirect", "/labcas-ui/d/index.html?dataset_id="+get_var["dataset_id"])
    }else if (get_var["search"]){
	    Cookies.set("login_redirect", "/labcas-ui/s/index.html?search="+get_var["search"])
    }
    localStorage.setItem('download_list',JSON.stringify(download_list));
    localStorage.setItem('download_size',download_size);
    window.location.replace("/labcas-ui/download.html");
}

function accepted_image_check(f){
    var img_ext = [".svs",".jpg",".gif",".jpeg",".dcm",".dicom",".png",".tif",".tiff",".scm",".scn",".qptif",".qptiff"];
    var pass_flag = false;
    f = String(f || "");
    $.each(img_ext, function(key,value){
       if (f.toLowerCase().endsWith(value)){
           pass_flag = true;
           return false;
       }
    });
    return pass_flag;
}

function minervaAcceptedImageCheck(f){
    var name = String(f || "").toLowerCase();
    return name.endsWith(".svs") ||
           name.endsWith(".scn") ||
           name.endsWith(".tif") ||
           name.endsWith(".tiff") ||
           name.endsWith(".ome.tif") ||
           name.endsWith(".ome.tiff") ||
           name.endsWith(".qptif") ||
           name.endsWith(".qptiff");
}

function labcasHtmlAttr(value){
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function minervaFirstValue(value){
    if ($.isArray(value)){
        return value.length ? value[0] : "";
    }
    return value || "";
}

function minervaFieldValue(obj, fields){
    obj = obj || {};
    for (var i = 0; i < fields.length; i += 1){
        if (obj[fields[i]]){
            return minervaFirstValue(obj[fields[i]]);
        }
    }
    return "";
}

function normalizeLabcasFileIdForDownload(fileId){
    var id = String(fileId || "");
    for (var i = 0; i < 3; i += 1) {
        try {
            var decoded = decodeURIComponent(id);
            if (decoded === id) {
                break;
            }
            id = decoded;
        } catch (e) {
            break;
        }
    }
    var escapedChars = '*?^${}()|[]\\~&!":';
    var normalized = "";
    for (var j = 0; j < id.length; j += 1) {
        if (id[j] === "\\" && j + 1 < id.length && escapedChars.indexOf(id[j + 1]) !== -1) {
            continue;
        }
        normalized += id[j];
    }
    return normalized;
}

function minervaItemFromDoc(doc){
    doc = doc || {};
    return {
        location: minervaFirstValue(doc.FileLocation),
        name: minervaFirstValue(doc.FileName),
        version: minervaFirstValue(doc.DatasetVersion),
        id: normalizeLabcasFileIdForDownload(doc.id || ""),
        size: minervaFirstValue(doc.FileSize),
        source: "labcas",
        MinervaStoryURL: minervaFieldValue(doc, ["MinervaStoryURL", "MinervaStoryUrl", "MinervaStory", "MinervaExhibitURL"]),
        MinervaExhibitUrl: minervaFieldValue(doc, ["MinervaExhibitUrl", "MinervaExhibit", "minerva_story_url", "minerva_exhibit_url"]),
        MinervaStorySessionURL: minervaFieldValue(doc, ["MinervaStorySessionURL", "MinervaStorySessionUrl", "MinervaSessionURL", "MinervaSessionUrl", "minerva_story_session_url", "minerva_session_url"])
    };
}

function minervaAttrsForDoc(doc){
    var item = minervaItemFromDoc(doc);
    return " data-name=\"" + labcasHtmlAttr(item.name) + "\"" +
           " data-location=\"" + labcasHtmlAttr(item.location) + "\"" +
           " data-version=\"" + labcasHtmlAttr(item.version) + "\"" +
           " data-story-url=\"" + labcasHtmlAttr(item.MinervaStoryURL) + "\"" +
           " data-exhibit-url=\"" + labcasHtmlAttr(item.MinervaExhibitUrl) + "\"" +
           " data-session-url=\"" + labcasHtmlAttr(item.MinervaStorySessionURL) + "\"";
}

function minervaItemFromCheckbox(checkbox){
    var $checkbox = $(checkbox);
    return {
        location: $checkbox.attr("data-location") || "",
        name: $checkbox.attr("data-name") || "",
        version: $checkbox.attr("data-version") || "",
        id: normalizeLabcasFileIdForDownload($checkbox.val() || ""),
        size: $checkbox.attr("data-valuesize") || "",
        source: "labcas",
        MinervaStoryURL: $checkbox.attr("data-story-url") || "",
        MinervaExhibitUrl: $checkbox.attr("data-exhibit-url") || "",
        MinervaStorySessionURL: $checkbox.attr("data-session-url") || ""
    };
}

function labcasCurrentPath(){
    return window.location.pathname + window.location.search;
}

function launchMinervaViewer(items, redirectTarget, storyUrl){
    if (!items || !items.length){
        alert("No pathology image files selected for Minerva.");
        return;
    }
    var normalized = [];
    $.each(items, function(_, item){
        if (!item){
            return;
        }
        if ($.isArray(item)){
            normalized.push({
                location: item[0] || "",
                name: item[1] || "",
                version: item[2] || "",
                id: normalizeLabcasFileIdForDownload(item[3] || ""),
                size: item[4] || "",
                source: "labcas"
            });
        } else {
            normalized.push({
                location: item.location || item.FileLocation || "",
                name: item.name || item.FileName || "",
                version: item.version || item.DatasetVersion || "",
                id: normalizeLabcasFileIdForDownload(item.id || ""),
                url: item.url || "",
                size: item.size || item.FileSize || "",
                source: item.source || "labcas",
                MinervaStoryURL: item.MinervaStoryURL || item.MinervaStoryUrl || item.minerva_story_url || "",
                MinervaExhibitUrl: item.MinervaExhibitUrl || item.MinervaExhibitURL || item.minerva_exhibit_url || "",
                MinervaStorySessionURL: item.MinervaStorySessionURL || item.MinervaStorySessionUrl || item.MinervaSessionURL || item.minerva_story_session_url || item.minerva_session_url || ""
            });
        }
    });
    localStorage.setItem("labcas_minerva_files", JSON.stringify(normalized));
    if (storyUrl){
        localStorage.setItem("labcas_minerva_story_url", storyUrl);
    } else {
        localStorage.removeItem("labcas_minerva_story_url");
    }
    if (redirectTarget){
        Cookies.set("login_redirect", redirectTarget);
    }
    window.location.replace("/labcas-ui/minerva/index.html?version=5.5.5");
}

function view_minerva_files(formname){
    var minerva_list = [];
    $("#" + formname + " input[type=\"checkbox\"]").each(function() {
        if ($(this).is(":checked")) {
            var item = minervaItemFromCheckbox(this);
            if (minervaAcceptedImageCheck(item.name) || minervaAcceptedImageCheck(item.id)) {
                minerva_list.push(item);
            }
        }
    });
    if (!minerva_list.length) {
        alert("Select one or more SVS, SCN, TIFF, OME-TIFF, or QPTIFF files first.");
        return;
    }
    launchMinervaViewer(minerva_list, labcasCurrentPath());
}

function view_minerva_row(button){
    var checkbox = $(button).closest("tr").find("input[type=\"checkbox\"]").get(0);
    if (!checkbox) {
        alert("This row is missing file metadata for Minerva.");
        return;
    }
    launchMinervaViewer([minervaItemFromCheckbox(checkbox)], labcasCurrentPath());
}
function download_dataset(dataset){
	console.log(localStorage.getItem('environment')+"/data-access-api/files/select?q=DatasetId:"+dataset+"&wt=json&indent=true&rows=10000");
	query_labcas_api(localStorage.getItem('environment')+"/data-access-api/files/select?q=DatasetId:"+dataset+"&wt=json&indent=true&rows=10000", generate_dataset_file_list);
}
function generate_dataset_file_list(data){
	var download_list = [];
	var download_size = 0;
	$.each(data.response.docs, function(key, value) {
                console.log(key);
                console.log(value.id);
                var html_safe_id = encodeURI(escapeRegExp(value.id));
                console.log(html_safe_id);
		download_list.push(html_safe_id);
		download_size += value.FileSize;
        });
	localStorage.setItem('download_list',JSON.stringify(download_list));
	localStorage.setItem('download_size',download_size);
	window.location.replace("/labcas-ui/download.html");
}
function download_script(filename) {
  var element = document.createElement('a');
  if (isMacintosh() || isLinux()){
	  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(localStorage.getItem("download_script").replace('----labcaspass----',"Bearer " + Cookies.get('token'))));
	  element.setAttribute('download', "labcas_download.sh");
  }else if(isWindows()){
	  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(localStorage.getItem("download_script_win").replace('----labcaspass----',"Bearer " + Cookies.get('token'))));
	  element.setAttribute('download', "labcas_download.ps1");
  }

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
  if (isMacintosh() || isLinux()){
	  $('#fileHTML').html("Now that you've downloaded the download script, you will also need to click below to download the script file list. Make sure the downloaded file list is stored in the same folder as the earlier download script. <B><font color=red>Please also ensure no previous file named files.csv are in the same folder directory.</font></B> In order to run the download, open a terminal, navigate to the folder of your download script and files.csv, then type:<br>sh labcas_download.sh");
  }else if(isWindows()){
	  $('#fileHTML').html("Now that you've downloaded the download script, you will also need to click below to download the script file list. Make sure the downloaded file list is stored in the same folder as the earlier download script. <B><font color=red>Please also ensure no previous file named files.csv are in the same folder directory.</font></B> In order to run the download, right click on the data_download.ps1 file and select \"Run with PowerShell\".");

  }
	$('#fileModal').modal({backdrop: 'static', keyboard: false});
        $('#fileModal').modal('show');
}
function download_script_files() {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.parse(localStorage.getItem("download_list")).join("\n"+localStorage.getItem('environment')+"/data-access-api/download?id=")));
  element.setAttribute('download', "files.csv");

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);

  localStorage.setItem("download_list",JSON.stringify([]));
  $('#download_list_link').hide();
   //window.location.reload();

}

function reset_search_filters(){
      var get_var = get_url_vars();
        localStorage.setItem("search", get_var["search"]);
        localStorage.setItem("search_filter", "off");


        $.each(localStorage.getItem("filters").split(","), function(ind, head) {
                var divs = localStorage.getItem(head+"_filters_div").split(",");
                $.each(divs, function(i, divhead) {
                        localStorage.setItem($.trim(divhead), "");
                        if(divhead.includes("_num_")){
                                localStorage.setItem($.trim(divhead)+"_0","");
                                localStorage.setItem($.trim(divhead)+"_1","");
                                localStorage.setItem($.trim(divhead)+"_max_0","");
                                localStorage.setItem($.trim(divhead)+"_max_1","");
                        }else{
                                localStorage.setItem($.trim(divhead)+"_val", "");
                        }
                });
        });
        localStorage.setItem("search", "*");
	window.history.replaceState({}, document.title, "/" + "labcas-ui/s/index.html?search=*");
}
function isMacintosh() {
  return navigator.platform.indexOf('Mac') > -1
}

function isWindows() {
  return navigator.platform.indexOf('Win') > -1
}
function isLinux() {
  return navigator.platform.indexOf('Linux') > -1
}
function UrlExists(url)
{
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status!=404 && http.status !=500;
}
function setupBootstrapTable(table){
    var $table = $('#'+table);
    $table.bootstrapTable({
            toolbar: ".toolbar",
            clickToSelect: true,
            showRefresh: true,
            search: true,
            showToggle: true,
            showColumns: true,
            pagination: true,
            searchAlign: 'left',
            pageSize: 50,
            clickToSelect: false,
            pageList: [8, 10, 25, 50, 100],

            formatShowingRows: function(pageFrom, pageTo, totalRows) {
                //do nothing here, we don't want to show the text "showing x of y from..."
            },
            formatRecordsPerPage: function(pageNumber) {
              return pageNumber + " rows visible";
            },
            icons: {
               refresh: 'fa fa-refresh',
               toggle: 'fa fa-th-list',
               columns: 'fa fa-columns',
               detailOpen: 'fa fa-plus-circle',
               detailClose: 'fa fa-minus-circle'
           }
    });

    //activate the tooltips after the data table is initialized
    $('[rel="tooltip"]').tooltip();

    $(window).resize(function() {
        $table.bootstrapTable('resetView');
    });

}

//IntroJS Trigger
function introWizard(check_first_time){
	if(check_first_time){
		if (localStorage.getItem("first_time_user") == "false"){
			return;
		}
	}
	localStorage.setItem("first_time_user","false");
	introJs().start();
}
