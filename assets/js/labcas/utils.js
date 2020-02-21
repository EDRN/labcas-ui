var user_data = {};
$().ready(function() {
	if(Cookies.get("userdata") && Cookies.get("userdata") != "None"){
		user_data = JSON.parse(Cookies.get("userdata"));
	}
	console.log(user_data);
});
function initCookies(){
	if(!Cookies.get("token") || Cookies.get("token") == "None"){
		$.ajax({
			  url: '/labcas-ui/assets/conf/environment.cfg?26',
			  dataType: 'json',
			  async: false,
			  success: function(json) {
			Cookies.set("user", "Public");
			Cookies.set("userletters", "PU");
			$.each( json, function( key, val ) {
				Cookies.set(key, val);
			});
	
			user_data = {"FavoriteCollections":[],"FavoriteDatasets":[],"FavoriteFiles":[]};
			if(Cookies.get("userdata") && Cookies.get("userdata") != "None"){
				var data = Cookies.get("userdata");
			
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
			Cookies.set("userdata",  JSON.stringify(user_data));
			Cookies.remove('JasonWebToken');
            $('#login_logout').html('<i class="nc-icon nc-button-power"></i> Log in')
            $('#login_logout').removeClass("text-danger");
            $('#login_logout').addClass("text-success");
		}});
		//user_data = JSON.parse(Cookies.get("userdata"));
	}
}

function writeUserData(udata){
	$.ajax({
        url: Cookies.get('environment')+"/data-access-api/userdata/create",
        beforeSend: function(xhr) { 
            xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
        },
        type: 'POST',
        data: udata,
        contentType:"application/json",
        dataType: 'json',
        success: function (data) {
            console.log(data);
            Cookies.set("userdata",  udata);
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
		url: Cookies.get('environment')+"/data-access-api/userdata/read?id="+Cookies.get('user'),
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
			Cookies.set("userdata",  JSON.stringify(user_data_tmp));
		},
		error: function(){
			 //alert("Login expired, please login...");
			 //window.location.replace("/labcas-ui/application/pages/login.html");
		 }
	});
}

function save_favorite(labcas_id, labcas_type){
	var user_id = Cookies.get('user');
	$.ajax({
        url: Cookies.get('environment')+"/data-access-api/userdata/read?id="+user_id,
        beforeSend: function(xhr) { 
            xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
        },
        type: 'GET',
        dataType: 'json',
        success: function (data) {
			var user_data_tmp = data;
			console.log(user_data_tmp);
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
	//writeUserData('{"id":"dliu", "FavoriteCollections":["test", "okay"], "LastLogin": "2019-10-30T12:00:00Z"}');
	//getUserData("dliu");
}

function dataset_compare_sort(a, b) {
  const idA = a.id.toUpperCase();
  const idB = b.id.toUpperCase();

  let comparison = 0;
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
			pis.push("<a href='"+Cookies.get('leadpi_url')+leadpi[1]+"-"+leadpi[0]+"'>"+obj.LeadPI[i]+"</a>");
			institutions.push("<a href='"+Cookies.get('institution_url')+inst_url+"'>"+o+"</a>");
			
		}
	}
	if (obj.ProtocolName){
                for (var i = 0; i < obj.ProtocolName.length; i++) {
                        o = $.trim(obj.ProtocolName[i]);
                        if (o != ""){
                                inst_url = o.replace(/\./g,"").replace(/\(/g,"").replace(/\)/g,"").replace(/ - /g," ").toLowerCase().replace(/ /g,"-");
                        }
                        protocols.push("<a href='"+Cookies.get('protocol_url')+inst_url+"'>"+o+"</a>");

                }
        }
	if (obj.Organ){
		for (var i = 0; i < obj.Organ.length; i++) {
			o = $.trim(obj.Organ[i]);
			if (o != ""){
				orgs.push("<a href='"+Cookies.get('organ_url')+o.toLowerCase()+"'>"+o+"</a>");
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
			if (o != ""){
				inst_split = o.replace(".","").toLowerCase().split(" ");
				inst_url = $.trim(obj.InstitutionId[i]);
				for (var c = 0; c < 7; c++) {
					if (!inst_split[c]){
						break;
					}
					inst_url += "-"+$.trim(inst_split[c]);
				}
				
				leadpi = $.trim(obj.LeadPI[i]).toLowerCase().split(" ");
				if (obj.LeadPI[i].includes("+")){
					leadpi = $.trim(obj.LeadPI[i]).toLowerCase().split("+");
				}
				pis.push("<a href='"+Cookies.get('institution_url')+inst_url+"/"+leadpi[1]+"-"+leadpi[0]+"'>"+obj.LeadPI[i]+"</a>");
				institutions.push("<a href='"+Cookies.get('institution_url')+inst_url+"'>"+o+"</a>");
			
			}
		}
	}
	if (obj.ProtocolName){
		for (var i = 0; i < obj.ProtocolName.length; i++) {
			o = $.trim(obj.ProtocolName[i]);
			if (o != ""){
				inst_split = o.replace(".","").replace(":","").toLowerCase().split(" ");
				inst_url = $.trim(obj.ProtocolId[i]);
				for (var c = 0; c < 7; c++) {
					if (!inst_split[c]){
						break;
					}
					inst_url += "-"+$.trim(inst_split[c]);
				}
				protocols.push("<a href='"+Cookies.get('protocol_url')+inst_url+"'>"+o+"</a>");
			
			}
		}
	}
	
	if (obj.Organ){
		for (var i = 0; i < obj.Organ.length; i++) {
			o = $.trim(obj.Organ[i]);
			if (o != ""){
				orgs.push("<a href='"+Cookies.get('organ_url')+o+"'>"+o+"</a>");
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
		/*if (upperbound < 10){
			upperbound =10;
		}*/
	}
	if (cpage - 20 > fastbackward){
		fastbackward = cpage - 20;
	}
	if (cpage + 20 < fastforward){
		fastforward = cpage + 20;
	}
	$('#'+divid+"_pagination_top").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+fastbackward+');">«</a></li>');
	$('#'+divid+"_pagination_bottom").append('<li class="page-item"><a class="page-link" onclick="paginate(\''+divid+'\','+fastbackward+');">«</a></li>');
	//console.log(cpage);
	//console.log(lowerbound);
	//console.log(upperbound);
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
		setup_labcas_dataset_data("datasetfiles",'id:"'+get_var["dataset_id"]+'"', 'id:'+get_var["dataset_id"]+'*', cpage-1); 
	}else if (divid == 'collections_search' || divid == 'datasets_search' || divid == 'files_search'){
		setup_labcas_search(get_var["search"], divid, cpage-1);
	}
}
function escapeRegExp(string) {
      return string.replace(/[\.\*\+\?\^\$\{\}\(\)\|\[\]\\~&!"]/g, '\\$&'); // $& means the whole matched string
}
