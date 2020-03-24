var root_app = "";
var test = "";
Array.prototype.contains = function(v) {
      for (var i = 0; i < this.length; i++) {
              if (this[i] === v) return true;
                }
        return false;
};

Array.prototype.unique = function() {
      var arr = [];
        for (var i = 0; i < this.length; i++) {
                if (!arr.contains(this[i])) {
                          arr.push(this[i]);
                              }
                  }
          return arr;
}
function reset_search_filters(){
      var get_var = get_url_vars();
        Cookies.set("search", get_var["search"]);
        Cookies.set("search_filter", "off");

        Cookies.set("organ_filters_val", "");
        Cookies.set("pi_filters_val", "");
        Cookies.set("disc_filters_val", "");
        Cookies.set("gender_filters_val","");
	Cookies.set("institution_filters_val","");
	Cookies.set("study_filters_val","");
	Cookies.set("collaborative_filters_val","");
        //Cookies.set("filetype_filters_val","");
        //Cookies.set("stain_filters_val","");
        //Cookies.set("procedure_filters_val","");
        //Cookies.set("fixative_filters_val","");
        //Cookies.set("ncitorgan_filters_val","");
        //Cookies.set("scan_filters_val","");
        //Cookies.set("animaltype_filters_val","");
        //Cookies.set("status_filters_val","");
        //Cookies.set("cohort_filters_val","");
        //Cookies.set("species_filters_val","");
        
        Cookies.set("organ_filters", "");
        Cookies.set("pi_filters", "");
        Cookies.set("disc_filters", "");
        Cookies.set("gender_filters","");
	Cookies.set("institution_filters","");
	Cookies.set("study_filters","");
	Cookies.set("collaborative_filters","");
        //Cookies.set("filetype_filters","");
        //Cookies.set("stain_filters","");
        //Cookies.set("procedure_filters","");
        //Cookies.set("fixative_filters","");
        //Cookies.set("ncitorgan_filters","");
        //Cookies.set("scan_filters","");
        //Cookies.set("animaltype_filters","");
        //Cookies.set("status_filters","");
        //Cookies.set("cohort_filters","");
        //Cookies.set("species_filters","");

        setup_labcas_search(get_var["search"], "all", 0);
}
function fill_collections_public_data(data){
	$.each(data.response.docs, function(index, obj) {
		if ((!obj.QAState) || (obj.QAState && !obj.QAState.includes("Private"))){
			var color = "btn-info";
			if(user_data["FavoriteCollections"].includes(obj.id)){
				color = "btn-success";
			}
		
		
			var institutions = obj.Institution? obj.Institution.join(",") : "";
			var pis = obj.LeadPI? obj.LeadPI.join(",") : "";
			var orgs = obj.Organ? obj.Organ.join(",") : "";
		
			if (Cookies.get('environment').includes("edrn-labcas")){
				var obj_arr = generate_edrn_links(obj);
				//institutions = obj_arr[0].join(",");
				protocols = obj_arr[3].join(",");
				//pis = obj_arr[1].join(",");
				orgs = obj_arr[2].join(",");
			}else if(Cookies.get('environment').includes("mcl-labcas") || Cookies.get('environment').includes("labcas-dev")){
				var obj_arr = generate_mcl_links(obj);
				protocols = obj_arr[3].join(",");
				//institutions = obj_arr[0].join(",");
				//pis = obj_arr[1].join(",");
				orgs = obj_arr[2].join(",");
			}
			//console.log(institutions);
			  $("#collection-table tbody").append(
				"<tr>"+
					"<td></td><td>"+
					"<a href=\"/labcas-ui/application/labcas_collection-detail_table.html?collection_id="+
						obj.id+"\">"+
					obj.CollectionName+"</a></td>"+
					"<td>"+pis+"</td>"+
					"<td>"+institutions+"</td>"+
					"<td>"+obj.Discipline+"</td>"+
					"<td>"+obj.DataCustodian+"</td>"+
					"<td>"+orgs+"</td>"+
					"<td class=\"td-actions text-right\">"+
							"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections')\" class=\"btn "+color+" btn-simple btn-link\">"+
								"<i class=\"fa fa-star\"></i>"+
							"</button>"+
						"</td>"+
				"</tr>");
			  //console.log(obj);
		}
    });
    $table.bootstrapTable({
            toolbar: ".toolbar",
            clickToSelect: true,
            showRefresh: true,
            search: true,
            showToggle: true,
            showColumns: true,
            pagination: true,
            searchAlign: 'left',
            pageSize: 8,
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
function fill_collections_data(data){
	
    $.each(data.response.docs, function(index, obj) {
    	var color = "btn-info";
		if(user_data["FavoriteCollections"].includes(obj.id)){
			color = "btn-success";
    	}
    	
		
		var institutions = obj.Institution? obj.Institution.join(", ") : "";
    	var pis = obj.LeadPI? obj.LeadPI.join(", ") : "";
    	var orgs = obj.Organ? obj.Organ.join(", ") : "";
    	var protocols = obj.ProtocolName? obj.ProtocolName.join(", ") : "";
    	
    	if (Cookies.get('environment').includes("edrn-labcas")){
			var obj_arr = generate_edrn_links(obj);
			//institutions = obj_arr[0].join(", ");
			protocols = obj_arr[3].join(", ");
			//pis = obj_arr[1].join(", ");
			orgs = obj_arr[2].join(", ");
		}else if(Cookies.get('environment').includes("mcl-labcas") || Cookies.get('environment').includes("labcas-dev")){
			var obj_arr = generate_mcl_links(obj);
			protocols = obj_arr[3].join(", ");
			//institutions = obj_arr[0].join(", ");
			//pis = obj_arr[1].join(", ");
			orgs = obj_arr[2].join(", ");
		}
		console.log(protocols);
		if (!protocols){
    		protocols = "";
    	}
    	//console.log(institutions);
    	
          $("#collection-table tbody").append(
            "<tr>"+
                "<td></td><td>"+
                "<a href=\"/labcas-ui/application/labcas_collection-detail_table.html?collection_id="+
                    obj.id+"\">"+
                obj.CollectionName+"</a></td>"+
                "<td>"+pis+"</td>"+
                "<td>"+protocols+"</td>"+
                "<td>"+institutions+"</td>"+
                "<td>"+obj.Discipline+"</td>"+
                "<td>"+obj.DataCustodian+"</td>"+
                "<td>"+orgs+"</td>"+
                "<td class=\"td-actions text-right\">"+
						"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections')\" class=\"btn "+color+" btn-simple btn-link\">"+
							"<i class=\"fa fa-star\"></i>"+
						"</button>"+
					"</td>"+
            "</tr>");
          //console.log(obj);
    });
    $table.bootstrapTable({
            toolbar: ".toolbar",
            clickToSelect: true,
            showRefresh: true,
            search: false,
            showToggle: true,
            showColumns: true,
            pagination: true,
            //searchAlign: 'left',
            pageSize: 8,
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
function fill_collection_details_data(data){
	var collectioname = data.response.docs[0].CollectionName;
	$("#collectiontitle").html(collectioname);
	if (collectioname.length > 35){
		collectioname = collectioname.slice(0,35);
	}
	$("#collection_name").html(collectioname);
	var obj = data.response.docs[0];
	var institutions = obj.Institution? obj.Institution.join(", ") : "";
	var pis = obj.LeadPI? obj.LeadPI.join(", ") : "";
	var orgs = obj.Organ? obj.Organ.join(", ") : "";
	
	if (Cookies.get('environment').includes("edrn-labcas")){
		var obj_arr = generate_edrn_links(obj);
		//institutions = obj_arr[0].join(", ");
		//pis = obj_arr[1].join(", ");
		protocols = obj_arr[3].join(",");
		orgs = obj_arr[2].join(", ");
	}else if(Cookies.get('environment').includes("mcl-labcas") || Cookies.get('environment').includes("labcas-dev")){
		var obj_arr = generate_mcl_links(obj);
		protocols = obj_arr[3].join(",");
		institutions = obj_arr[0].join(", ");
		pis = obj_arr[1].join(", ");
		orgs = obj_arr[2].join(", ");
	}
	
	obj.Institution = institutions;
	obj.LeadPI = pis;
	obj.Organ = orgs;
	obj.ProtocolName = protocols;
	obj.Consortium = obj.Consortium? "<a href='"+Cookies.get('environment_url')+"'>"+obj.Consortium+"</a>" : "";
	
	var hide_headers = Cookies.get('collection_header_hide').split(',');
	var show_headers = Cookies.get('collection_header_order').split(',');
	var collapse_headers = Cookies.get('collapsible_headers').split(',');
	var collection_id_append = Cookies.get('collection_id_append').split(',');
	
	$.each(show_headers, function(ind, head) {
		var value = obj[head];
		//console.log(value);
		if ($.isArray(value)){
			value = value.join(",");
		}
		if (typeof value == "string"){
			value = value.replace(/% /g,'_labcasPercent_');
			value = decodeURIComponent(value);
			value = value.replace(/\+/g,"&nbsp;").replace(/_labcasPercent_/g,'% ');
        }
		if (collection_id_append.includes(head)){
			value += " ("+obj[head+"Id"]+")";
		}else if (collapse_headers.includes(head)){
            if (value.length > 20){
                value = "<nobr>"+value.substring(0, 20) + "<a data-toggle='collapse' id='#"+head+"Less' href='#"+head+"Collapse' role='button' aria-expanded='false' onclick='document.getElementById(\"#"+head+"Less\").style.display = \"none\";'>... More</a></nobr><div class='collapse' id='"+head+"Collapse'>" + value.substring(20) + " <a data-toggle='collapse' href='#"+head+"Collapse' role='button' aria-expanded='false' onclick='document.getElementById(\"#"+head+"Less\").style.display = \"block\";'>Less</a></div>";
            }
        }
        $("#collectiondetails-table tbody").append(
            "<tr>"+
				"<td class='text-right' valign='top' style='padding: 2px 8px;' width='30%'>"+head.replace( /([a-z])([A-Z])/g, "$1 $2" )+":</td>"+
				"<td class='text-left' valign='top' style='padding: 2px 8px;'>"+
					value+
				"</td>"+
			"</tr>");
	});
	$.each(obj, function(key, value) {
		if (show_headers.includes(key) || hide_headers.includes(key)){
			return;
		}
		
		if ($.isArray(value)){
			value = value.join(",");
		}
		if (typeof value == "string"){
			value = value.replace(/% /g,'_labcasPercent_');
			value = decodeURIComponent(value);
			value = value.replace(/\+/g,"&nbsp;").replace(/_labcasPercent_/g,'% ');
		}
		if (collapse_headers.includes(key)){
            if (value.length > 20){
                value = "<nobr>"+value.substring(0, 20) + "<a data-toggle='collapse' id='#"+key+"Less' href='#"+key+"Collapse' role='button' aria-expanded='false' onclick='document.getElementById(\"#"+key+"Less\").style.display = \"none\";'>... More</a></nobr><div class='collapse' id='"+key+"Collapse'>" + value.substring(20) + " <a data-toggle='collapse' href='#"+key+"Collapse' role='button' aria-expanded='false' onclick='document.getElementById(\"#"+key+"Less\").style.display = \"block\";'>Less</a></div>";
            }
        }
          $("#collectiondetails-table tbody").append(
            "<tr>"+
				"<td class='text-right' valign='top' style='padding: 2px 8px;' width='30%'>"+key.replace( /([a-z])([A-Z])/g, "$1 $2" )+":</td>"+
				"<td class='text-left' valign='top' style='padding: 2px 8px;'>"+
					value+
				"</td>"+
			"</tr>");
		
    });
    
}
function fill_dataset_details_data(data){
	var datasetname = data.response.docs[0].DatasetName;
	$("#datasettitle").html(datasetname);
	if (datasetname.length > 25){
		datasetname = datasetname.slice(0,25);
	}
	$("#dataset_name").html(datasetname);
	
	var collectionid = data.response.docs[0].CollectionId;
	var collectionname = data.response.docs[0].CollectionName;
	$("#collection_name").html("<a href=\"/labcas-ui/application/labcas_collection-detail_table.html?collection_id="+collectionid+"\">"+collectionname+"</a>");
	
	var hide_headers = Cookies.get('dataset_header_hide').split(',');
    var show_headers = Cookies.get('dataset_header_order').split(',');
    var collection_id_append = Cookies.get('dataset_id_append').split(',');
	
	$.each(show_headers, function(ind, head) {
        var value = data.response.docs[0][head];
        console.log(head);
        console.log(value);
        if (!value){
            return;
        }
        
        if ($.isArray(value)){
            value = value.join(",");
        }
        if (typeof value == "string"){
			value = value.replace(/% /g,'_labcasPercent_');
			value = decodeURIComponent(value);
			value = value.replace(/\+/g,"&nbsp;").replace(/_labcasPercent_/g,'% ');
        }
        if (collection_id_append.includes(head)){
            value += " ("+data.response.docs[0][head+"Id"]+")";
        }
        $("#datasetdetails-table tbody").append(
            "<tr>"+
				"<td class='text-right'  valign='top' style='padding: 2px 8px;' width='20%'>"+head.replace( /([a-z])([A-Z])/g, "$1 $2" )+":</td>"+
				"<td class='text-left'  valign='top' style='padding: 2px 8px;'>"+
					value+
				"</td>"+
			"</tr>");
		
    });
	
	$.each(data.response.docs[0], function(key, value) {
		if (show_headers.includes(key) || hide_headers.includes(key)){
            return;
        }
		if ($.isArray(value)){
			value = value.join(",");
		}
		if (typeof value == "string"){
			value = value.replace(/% /g,'_labcasPercent_');
			value = decodeURIComponent(value);
			value = value.replace(/\+/g,"&nbsp;").replace(/_labcasPercent_/g,'% ');
        }
        
          $("#datasetdetails-table tbody").append(
            "<tr>"+
				"<td class='text-right'  valign='top' style='padding: 2px 8px;' width='20%'>"+key.replace( /([a-z:])([A-Z])/g, "$1 $2" )+":</td>"+
				"<td class='text-left' valign='top' style='padding: 2px 8px;'>"+
					value+
				"</td>"+
			"</tr>");
		
    });
}
function fill_file_details_data(data){
	$("#filetitle").html(data.response.docs[0].FileName);
	$.each(data.response.docs[0], function(key, value) {
		if (key == "_version_"){
			return;
		}
		if ($.isArray(value)){
			value = value.join(",");
		}
          $("#filedetails-table tbody").append(
            "<tr>"+
				"<td class='text-right'  valign='top' style='padding: 2px 8px;' width='20%'>"+key.replace( /([A-Z])/g, " $1" )+":</td>"+
				"<td class='text-left' valign='top' style='padding: 2px 8px;'>"+
					value+
				"</td>"+
			"</tr>");
		
    });
    $("#file_details_len").html(Object.keys(data.response.docs[0]).length);
    var html_safe_id = encodeURI(escapeRegExp(data.response.docs[0].id));
    
    $("#download_icon").attr("onclick","location.href='"+Cookies.get('environment')+"/data-access-api/download?id="+html_safe_id+"';");

}
function fill_datasets_data(data){

	data.response.docs.sort(dataset_compare_sort);
	$.each(data.response.docs, function(key, value) {
			var color = "btn-info";
			if(user_data["FavoriteDatasets"].includes(value.id)){
				color = "btn-success";
			}
				if (value.id.split("/").length - 2 > 0){
					value.DatasetName = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(value.id.split("/").length - 2)+"<span>&#8226;</span>"+value.DatasetName
				}
			  $("#datasets-table tbody").append(
				"<tr>"+
					"<td><!--<div class=\"form-check\">"+
						"<label class=\"form-check-label\">"+
							"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
							"<span class=\"form-check-sign\"></span>"+
						"</label>"+
					"</div>--></td>"+
					"<td class='text-left' valign='middle' style='padding: 0px 8px; vertical-align: middle;'>"+
                        "<a href=\"/labcas-ui/application/labcas_dataset-detail_table.html?dataset_id="+
                            value.id+"\">"+
                            value.DatasetName+
                        "</a>"+
					"</td>"+
					"<td class=\"td-actions text-right\" valign='middle' style='padding: 0px 8px; vertical-align: middle;'>"+
						"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+value.id+"', 'FavoriteDatasets')\" class=\"btn "+color+" btn-simple btn-link\">"+
							"<i class=\"fa fa-star\"></i>"+
						"</button>"+
					"</td>"+
				"</tr>");
		});                                                                     
    $("#collection_datasets_len").html(data.response.numFound); 
    $("#collection_favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
	
}
function fill_files_data(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	load_pagination("files",size,cpage);
	$("#files-table tbody").empty();
	$.each(data.response.docs, function(key, value) {
	
		var color = "btn-info";
		if(user_data["FavoriteFiles"].includes(value.id)){
			color = "btn-success";
		}
		
		var thumb = "";
		var filetype = value.FileType ? value.FileType.join(",") : "";
		var description = value.Description? value.Description.join(",") : "";
		if ('ThumbnailRelativePath' in value){
			thumb = "<img width='50' height='50' src='/labcas-ui/assets/"+value.ThumbnailRelativePath+"'/>";
		}
        var html_safe_id = encodeURI(escapeRegExp(value.id));
		$("#files-table tbody").append(
		"<tr>"+
			"<td><div class=\"form-check\">"+
				"<label class=\"form-check-label\">"+
					"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
					"<span class=\"form-check-sign\"></span>"+
				"</label>"+
			"</div></td>"+
			"<td class='text-left'>"+
				"<a href=\"/labcas-ui/application/labcas_file-detail_table.html?file_id="+
					html_safe_id+"\">"+
					value.FileName+
				"</a>"+
			"</td>"+
			"<td class='text-left'>"+
					filetype +
			"</td>"+
			"<td class='text-left'>"+
					description +
			"</td>"+
			"<td class='text-left'>"+
					thumb+
			"</td>"+
			"<td class='text-left'>"+
					value.FileSize+
			"</td>"+
			"<td class=\"td-actions text-right\">"+
				"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+value.id+"', 'FavoriteFiles')\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
				"<button type=\"button\" rel=\"tooltip\" title=\"Download\" class=\"btn btn-danger btn-simple btn-link\" onclick=\"location.href='"+Cookies.get('environment')+"/data-access-api/download?id="+html_safe_id+"'\">"+
					"<i class=\"fa fa-download\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});                                                                     
    $("#dataset_files_len").html(size); 
    $("#dataset_favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
}

function setup_labcas_data(datatype, query, dataset_query){	
    console.log(Cookies.get('environment'));
    $.ajax({
        url: Cookies.get('environment')+"/data-access-api/collections/select?q="+query+"&wt=json&indent=true&rows=2147483647",
        beforeSend: function(xhr) { 
        	if(Cookies.get('token') && Cookies.get('token') != "None"){
        		console.log("HERE");
            	xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
            }
        },
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            if (datatype == "collections"){
                fill_collections_data(data);
            }else if (datatype == "collections_public"){
            	fill_collections_public_data(data);
            }else if (datatype == "collectiondatasets"){
                fill_collection_details_data(data);
                $.ajax({
					url: Cookies.get('environment')+"/data-access-api/files/select?q="+dataset_query+"&wt=json&indent=true",
					beforeSend: function(xhr) { 
						if(Cookies.get('token') && Cookies.get('token') != "None"){
							xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
						} 
					},
					type: 'GET',
					dataType: 'json',
					processData: false,
					success: function (data) {
						$("#collection_files_len").html(data.response.numFound);
					},
					error: function(){
						 alert("Login expired, please login...");
						 window.location.replace("/labcas-ui/application/pages/login.html");
					 }
				});
            }
        },
        error: function(){
             alert("Login expired, please login...");
             window.location.replace("/labcas-ui/application/pages/login.html");
         }
    });
    if (datatype == "collectiondatasets"){
    	$.ajax({
			url: Cookies.get('environment')+"/data-access-api/datasets/select?q="+dataset_query+"&wt=json&indent=true&rows=2147483647",
			beforeSend: function(xhr) { 
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
			},
			type: 'GET',
			dataType: 'json',
			processData: false,
			success: function (data) {
                //console.log(Cookies.get('environment')+"/data-access-api/datasets/select?q="+dataset_query+"&wt=json&indent=true&rows=2147483647");
                //console.log(Cookies.get('token'));
                fill_datasets_data(data);
			},
			error: function(){
                 alert("Login expired, please login...");
                 window.location.replace("/labcas-ui/application/pages/login.html");
			 }
		});
    }
}
function setup_labcas_dataset_data(datatype, query, file_query, cpage){
    if (cpage == 0){ //if this isn't a pagination request and a default load
		$.ajax({
			url: Cookies.get('environment')+"/data-access-api/datasets/select?q="+query+"&wt=json&indent=true",
			xhrFields: {
					withCredentials: true
			  },
			beforeSend: function(xhr, settings) { 
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				} 
			},
			dataType: 'json',
			success: function (data) {
				fill_dataset_details_data(data);
			},
			error: function(){
				 alert("Login expired, please login...");
				 window.location.replace("/labcas-ui/application/pages/login.html");
			 
			 }
		});
    }
    
    $.ajax({
        url: Cookies.get('environment')+"/data-access-api/files/select?q="+file_query+"&wt=json&indent=true&start="+cpage*10,
        xhrFields: {
                withCredentials: true
          },
        beforeSend: function(xhr, settings) { 
            if(Cookies.get('token') && Cookies.get('token') != "None"){
            	xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
            }
        },
        dataType: 'json',
        success: function (data) {
            fill_files_data(data);
        },
        error: function(){
             alert("Login expired, please login...");
             window.location.replace("/labcas-ui/application/pages/login.html");
             
         }
    });
}

function setup_labcas_file_data(datatype, query, file_query){
    //console.log( Cookies.get('environment')+"/data-access-api/files/select?q="+query+"&wt=json&indent=true");
    $.ajax({
        url: Cookies.get('environment')+"/data-access-api/files/select?q="+query+"&wt=json&indent=true",
        xhrFields: {
                withCredentials: true
          },
        beforeSend: function(xhr, settings) { 
            if(Cookies.get('token') && Cookies.get('token') != "None"){
            	xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
            }
        },
        dataType: 'json',
        success: function (data) {
            fill_file_details_data(data);
        },
        error: function(){
             alert("Login expired, please login...");
             window.location.replace("/labcas-ui/application/pages/login.html");
             
         }
    });
}




/*Search Section*/

function fill_datasets_facets(data){
	console.log("Data_facets_output");
	console.log(data);
    //if (Cookies.get("search_filter") != "on"){
        generate_filters("ExperimentStatus","status_filters", data.facet_counts.facet_fields.ExperimentStatus);
        generate_filters("Cohort","cohort_filters", data.facet_counts.facet_fields.Cohort);
        generate_filters("Species","species_filters", data.facet_counts.facet_fields.Species);
    //}
}

function fill_datasets_search(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	load_pagination("datasets_search",size,cpage);
	console.log("datasets");
	console.log(data);
	$("#search-dataset-table tbody").empty();

	console.log(data);
	$.each(data.response.docs, function(key, obj) {
	  var color = "btn-info";
	  if(user_data["FavoriteDatasets"].includes(obj.id)){
			color = "btn-success";
	  }
	
	  var thumb = "";
	  var filetype = obj.FileType ? obj.FileType.join(",") : "";
	  var description = obj.Description? obj.Description.join(",") : "";
	  if ('FileThumbnailUrl' in obj){
		thumb = "<img width='50' height='50' src='"+obj.FileThumbnailUrl+"'/>";
	  }

	  $("#search-dataset-table tbody").append(
		"<tr>"+
			"<td><div class=\"form-check\">"+
				"<label class=\"form-check-label\">"+
					"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
					"<span class=\"form-check-sign\"></span>"+
				"</label>"+
			"</div></td><td>"+
			"<a href=\"/labcas-ui/application/labcas_dataset-detail_table.html?dataset_id="+
                    obj.id+"\">"+
                obj.DatasetName+"</a></td>"+
                "<td><a href=\"/labcas-ui/application/labcas_collection-detail_table.html?collection_id="+
                    obj.CollectionId+"\">"+
                    	obj.CollectionName+"</a></td>"+
                "<td>"+obj.DatasetVersion+"</td>"+
			"<td class=\"td-actions text-right\">"+
				"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteDatasets')\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});                

	$("#datasets_len").html(size); 
}

function fill_files_facets(data){
	
    //if (Cookies.get("search_filter") != "on"){
        generate_filters("FileType","filetype_filters", data.facet_counts.facet_fields["FileType"]);
        generate_filters("labcas.pathology:Stain","stain_filters", data.facet_counts.facet_fields["labcas.pathology:Stain"]);
        generate_filters("labcas.pathology:NCITProcedure","procedure_filters", data.facet_counts.facet_fields["labcas.pathology:NCITProcedure"]);
        generate_filters("labcas.pathology:Fixative","fixative_filters", data.facet_counts.facet_fields["labcas.pathology:Fixative"]);
        generate_filters("labcas.pathology:NCITOrganCode","ncitorgan_filters", data.facet_counts.facet_fields["labcas.pathology:NCITOrganCode"]);
        generate_filters("labcas.pathology:Gender","gender_filters", data.facet_counts.facet_fields["labcas.pathology:Gender"]);
        generate_filters("labcas.pathology:ScanStatus","scan_filters", data.facet_counts.facet_fields["labcas.pathology:ScanStatus"]);
        generate_filters("labcas.pathology:AnimalType","animaltype_filters", data.facet_counts.facet_fields["labcas.pathology:AnimalType"]);
    //}
}
function fill_files_search(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	load_pagination("files_search",size,cpage);
	$("#search-file-table tbody").empty();
	$.each(data.response.docs, function(key, obj) {
	  var color = "btn-info";
	  if(user_data["FavoriteFiles"].includes(obj.id)){
			color = "btn-success";
	  }
	  var thumb = "";
	  var filetype = obj.FileType ? obj.FileType.join(",") : "";
	  var description = obj.Description? obj.Description.join(",") : "";
	  if ('FileThumbnailUrl' in obj){
		thumb = "<img width='50' height='50' src='"+obj.FileThumbnailUrl+"'/>";
	  }
	  $("#search-file-table tbody").append(
		"<tr>"+
			"<td><div class=\"form-check\">"+
				"<label class=\"form-check-label\">"+
					"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
					"<span class=\"form-check-sign\"></span>"+
				"</label>"+
			"</div></td>"+
			"<td class='text-left'>"+
				"<a href=\"/labcas-ui/application/labcas_file-detail_table.html?file_id="+
					obj.id+"\">"+
					obj.FileName+
				"</a>"+
			"</td>"+
			"<td class='text-left'>"+
					filetype +
			"</td>"+
			"<td class='text-left'>"+
					description +
			"</td>"+
			"<td class='text-left'>"+
					thumb+
			"</td>"+
			"<td class='text-left'>"+
					obj.FileSize+
			"</td>"+
			"<td class=\"td-actions text-right\">"+
				"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteFiles')\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});              
	$("#files_len").html(size); 
}
function generate_filters(field_type, placeholder, data){
	var filters = [];
	var counts = [];
	$("#"+placeholder).html("");
        $.each(data, function(key, obj) {
            if ($.isNumeric(obj)){
                counts.push(obj);
            }else{
                filters.push(obj);
            }
        });
        $.each(filters, function(i, o){
	    if (counts[i] > 0){
		var checked = "";
		if (Cookies.get(placeholder+"_val") && Cookies.get(placeholder+"_val").includes($.trim(o))){
			checked = "checked";
		}
		    $("#"+placeholder).append($(' <div class="row"><div class="col-md-9">'+$.trim(o)+" ("+$.trim(counts[i])+')</div><div class="col-md-3"><input type="checkbox" '+checked+' name="'+placeholder+'[]" value="'+$.trim(o)+'" data-toggle="switch" data-on-color="info" data-off-color="info" data-on-text="<i class=\'fa fa-check\'></i>" data-off-text="<i class=\'fa fa-times\'></i>"><span class="toggle"></span></div></div>'));
	    }
        });
        $('input[name="'+placeholder+'[]"]').change(function() {
            var field_val = [];
            $("input[name='"+placeholder+"[]']").each(function (index, obj) {
                if(this.checked) {
                    field_val.push(this.value);
                }
            });
            var field_search = "";
            if (field_val.length > 0){
		var str_field_val = field_val.map(x => encodeURI(escapeRegExp(String(x))));
		
                field_search = "&fq=("+encodeURI(escapeRegExp(field_type)).replace(/:/g,'%3A')+":"+str_field_val.join(" OR "+encodeURI(escapeRegExp(field_type))+":")+")";
            }
            Cookies.set(placeholder, field_search);
            Cookies.set(placeholder+"_val",field_val);
            Cookies.set("search_filter", "on");
            setup_labcas_search(Cookies.get('search'), "all", 0);
        });
}
function fill_collections_facets(data){
	//console.log("DATA");
	//console.log(data);
	//console.log("DATA3");
	
    //if (Cookies.get("search_filter") != "on"){
	generate_filters("Organ","organ_filters", data.facet_counts.facet_fields.Organ);
	generate_filters("LeadPI","pi_filters", data.facet_counts.facet_fields.LeadPI);
	generate_filters("Discipline","disc_filters", data.facet_counts.facet_fields.Discipline);
	generate_filters("Institution","institution_filters", data.facet_counts.facet_fields.Institution);
	generate_filters("Study","study_filters", data.facet_counts.facet_fields.Study);
	generate_filters("CollaborativeGroup","collaborative_filters", data.facet_counts.facet_fields.CollaborativeGroup);
    //}
}
function fill_collections_search(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	load_pagination("collections_search",size,cpage);
	$("#search-collection-table tbody").empty();
    //var organ_filter = [];
    //var pi_filter = [];
    //var disc_filter = [];
	$.each(data.response.docs, function(key, obj) {
	  var color = "btn-info";
	  if(user_data["FavoriteCollections"].includes(obj.id)){
			color = "btn-success";
	  }
	  var thumb = "";
	  var filetype = obj.FileType ? obj.FileType.join(",") : "";
	  var description = obj.Description? obj.Description.join(",") : "";
	  if ('FileThumbnailUrl' in obj){
		thumb = "<img width='50' height='50' src='"+obj.FileThumbnailUrl+"'/>";
	  }
      //organ_filter.push(String(obj.Organ));
      //disc_filter.push(String(obj.Discipline));
      //pi_filter.push(String(obj.LeadPI));
	  $("#search-collection-table tbody").append(
		"<tr>"+
			"<td><div class=\"form-check\">"+
				"<label class=\"form-check-label\">"+
					"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
					"<span class=\"form-check-sign\"></span>"+
				"</label>"+
			"</div></td><td>"+
			"<a href=\"/labcas-ui/application/labcas_collection-detail_table.html?collection_id="+
                    obj.id+"\">"+
                obj.CollectionName+"</a></td>"+
                "<td>"+obj.LeadPI+"</td>"+
                "<td>"+obj.Institution+"</td>"+
                "<td>"+obj.Discipline+"</td>"+
                "<td>"+obj.DataCustodian+"</td>"+
                "<td>"+obj.Organ+"</td>"+
			"<td class=\"td-actions text-right\">"+
				"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\"  onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections')\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});                                                                     
    $("#collections_len").html(size); 
    //organ_filter = organ_filter.unique();
    //disc_filter = disc_filter.unique();
    //pi_filter = pi_filter.unique();
}


function setup_labcas_search(query, divid, cpage){
    console.log("Searching...");

	var collection_filters = Cookies.get('organ_filters')+Cookies.get('pi_filters')+Cookies.get('disc_filters')+Cookies.get('study_filters')+Cookies.get('institution_filters')+Cookies.get('collaborative_filters')
	//var data_filters = Cookies.get('species_filters')+Cookies.get('cohort_filters')+Cookies.get('status_filters')
	var data_filters = "";
	//var file_filters = Cookies.get("filetype_filters")+Cookies.get("stain_filters")+Cookies.get("procedure_filters")+Cookies.get("fixative_filters")+Cookies.get("ncitorgan_filters")+Cookies.get("gender_filters")+Cookies.get("scan_filters")+Cookies.get("animaltype_filters")+Cookies.get('organ_filters')+Cookies.get('pi_filters')+Cookies.get('disc_filters');
	//var file_filters = Cookies.get("filetype_filters")+Cookies.get("stain_filters")+Cookies.get("procedure_filters")+Cookies.get("fixative_filters")+Cookies.get("ncitorgan_filters")+Cookies.get("gender_filters")+Cookies.get("scan_filters")+Cookies.get("animaltype_filters")+Cookies.get('organ_filters')+Cookies.get('pi_filters')+Cookies.get('disc_filters');
	var file_filters = Cookies.get("gender_filters")

	var collection_facets = ['Organ','LeadPI', 'Discipline','Study','Institution','CollaborativeGroup'];
	//var dataset_facets = ['ExperimentStatus','Species','Cohort'];
	var dataset_facets = [];
	//var file_facets = ['labcas.pathology:Stain','labcas.pathology:NCITProcedure','labcas.pathology:Fixative','labcas.pathology:NCITOrganCode','FileType','labcas.pathology:Gender','labcas.pathology:ScanStatus','labcas.pathology:AnimalType'];
	var file_facets = ['labcas.pathology:Gender'];

    if (divid == "collections_search" || divid == "all"){
		console.log(Cookies.get('environment')+"/data-access-api/collections/select?q=*"+query+"*"+collection_filters+data_filters+file_filters+"&wt=json&indent=true&start="+cpage*10);
		$.ajax({
			url: Cookies.get('environment')+"/data-access-api/collections/select?q=*"+query+"*"+collection_filters+data_filters+file_filters+"&wt=json&indent=true&start="+cpage*10,	
			beforeSend: function(xhr) {
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
			},
			type: 'GET',
			dataType: 'json',
			success: function (data) {
				fill_collections_search(data);
			},
			error: function(){
				 alert("Login expired, please login...");
				 window.location.replace("/labcas-ui/application/pages/login.html");
			 }
		});
		console.log(Cookies.get('environment')+"/data-access-api/collections/select?q=*:*"+collection_filters+data_filters+file_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&facet.field="+dataset_facets.join("&facet.field=")+"&facet.field="+file_facets.join("&facet.field=")+"&wt=json&rows=0");
		$.ajax({
			url: Cookies.get('environment')+"/data-access-api/collections/select?q=*:*"+collection_filters+data_filters+file_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&facet.field="+dataset_facets.join("&facet.field=")+"&facet.field="+file_facets.join("&facet.field=")+"&wt=json&rows=0",
			beforeSend: function(xhr) {
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
			},
			type: 'GET',
			dataType: 'json',
			success: function (data) {
				fill_collections_facets(data);
			},
			error: function(){
				 alert("Login expired, please login...");
				 window.location.replace("/labcas-ui/application/pages/login.html");
			 }
		});
    }
    if (divid == "datasets_search" || divid == "all"){
	console.log(Cookies.get('environment')+"/data-access-api/datasets/select?q=*"+query+"*"+collection_filters+data_filters+file_filters+"&wt=json&indent=true&start="+cpage*10);
	console.log(Cookies.get('environment')+"/data-access-api/datasets/select?q=*:*"+collection_filters+data_filters+file_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&facet.field="+dataset_facets.join("&facet.field=")+"&facet.field="+file_facets.join("&facet.field=")+"&wt=json&rows=0");
        $.ajax({
            url: Cookies.get('environment')+"/data-access-api/datasets/select?q=*"+query+"*"+collection_filters+data_filters+file_filters+"&wt=json&indent=true&start="+cpage*10,
            beforeSend: function(xhr) {
                if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
            },
            type: 'GET',
            dataType: 'json',
            processData: false,
            success: function (data) {
                fill_datasets_search(data);
            },
            error: function(){
                 alert("Login expired, please login...");
                 window.location.replace("/labcas-ui/application/pages/login.html");
             }
        });
        $.ajax({
	    url: Cookies.get('environment')+"/data-access-api/datasets/select?q=*:*"+collection_filters+data_filters+file_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&facet.field="+dataset_facets.join("&facet.field=")+"&facet.field="+file_facets.join("&facet.field=")+"&wt=json&rows=0",
            beforeSend: function(xhr) {
                if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
            },
            type: 'GET',
            dataType: 'json',
            processData: false,
            success: function (data) {
                fill_datasets_facets(data);
            },
            error: function(){
                 alert("Login expired, please login...");
                 window.location.replace("/labcas-ui/application/pages/login.html");
             }
        });
    }
    if (divid == "files_search" || divid == "all"){
		$.ajax({
			url: Cookies.get('environment')+"/data-access-api/files/select?q=*"+query+"*"+collection_filters+data_filters+file_filters+"&wt=json&indent=true&start="+cpage*10,
			xhrFields: {
					withCredentials: true
			  },
			beforeSend: function(xhr, settings) { 
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				} 
			},
			dataType: 'json',
			success: function (data) {
				fill_files_search(data);
			},
			error: function(){
				 alert("Login expired, please login...");
				 window.location.replace("/labcas-ui/application/pages/login.html");
			 
			 }
		});

		$.ajax({
			url: Cookies.get('environment')+"/data-access-api/files/select?q=*:*"+collection_filters+data_filters+file_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&facet.field="+dataset_facets.join("&facet.field=")+"&facet.field="+file_facets.join("&facet.field=")+"&wt=json&rows=0",
			xhrFields: {
					withCredentials: true
			  },
			beforeSend: function(xhr, settings) { 
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				} 
			},
			dataType: 'json',
			success: function (data) {
				fill_files_facets(data);
			},
			error: function(){
				 alert("Login expired, please login...");
				 window.location.replace("/labcas-ui/application/pages/login.html");
			 
			 }
		});
	}
}
/* End Search Section */


/*Starred Section*/
function fill_datasets_starred(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	//load_pagination("datasets_search",size,cpage);
	//console.log(data);
	$("#starred-dataset-table tbody").empty();
	$.each(data.response.docs, function(key, obj) {
	  if(user_data["FavoriteDatasets"].includes(obj.id)){
		  var color = "btn-success";
	  
	
		  var thumb = "";
		  var filetype = obj.FileType ? obj.FileType.join(",") : "";
		  var description = obj.Description? obj.Description.join(",") : "";
		  if ('FileThumbnailUrl' in obj){
			thumb = "<img width='50' height='50' src='"+obj.FileThumbnailUrl+"'/>";
		  }
		  $("#starred-dataset-table tbody").append(
			"<tr>"+
				"<td><div class=\"form-check\">"+
					"<label class=\"form-check-label\">"+
						"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
						"<span class=\"form-check-sign\"></span>"+
					"</label>"+
				"</div></td><td>"+
				"<a href=\"/labcas-ui/application/labcas_dataset-detail_table.html?dataset_id="+
						obj.id+"\">"+
					obj.DatasetName+"</a></td>"+
					"<td><a href=\"/labcas-ui/application/labcas_collection-detail_table.html?collection_id="+
						obj.CollectionId+"\">"+
							obj.CollectionName+"</a></td>"+
					"<td>"+obj.DatasetVersion+"</td>"+
				"<td class=\"td-actions text-right\">"+
					"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteDatasets')\" class=\"btn "+color+" btn-simple btn-link\">"+
						"<i class=\"fa fa-star\"></i>"+
					"</button>"+
				"</td>"+
			"</tr>");	
		  }
	});                
	$("#datasets_len").html(size); 
}
function fill_files_starred(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	//load_pagination("files_search",size,cpage);
	//console.log(data);
	$("#starred-file-table tbody").empty();
	$.each(data.response.docs, function(key, obj) {
	  //if(user_data["FavoriteFiles"].includes(obj.id)){
		  var color = "btn-success";
	  
		  var thumb = "";
		  var filetype = obj.FileType ? obj.FileType.join(",") : "";
		  var description = obj.Description? obj.Description.join(",") : "";
		  if ('FileThumbnailUrl' in obj){
			thumb = "<img width='50' height='50' src='"+obj.FileThumbnailUrl+"'/>";
		  }
		  $("#starred-file-table tbody").append(
			"<tr>"+
				"<td><div class=\"form-check\">"+
					"<label class=\"form-check-label\">"+
						"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
						"<span class=\"form-check-sign\"></span>"+
					"</label>"+
				"</div></td>"+
				"<td class='text-left'>"+
					"<a href=\"/labcas-ui/application/labcas_file-detail_table.html?file_id="+
						obj.id+"\">"+
						obj.FileName+
					"</a>"+
				"</td>"+
				"<td class='text-left'>"+
						filetype +
				"</td>"+
				"<td class='text-left'>"+
						description +
				"</td>"+
				"<td class='text-left'>"+
						thumb+
				"</td>"+
				"<td class='text-left'>"+
						obj.FileSize+
				"</td>"+
				"<td class=\"td-actions text-right\">"+
					"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteFiles')\" class=\"btn "+color+" btn-simple btn-link\">"+
						"<i class=\"fa fa-star\"></i>"+
					"</button>"+
				"</td>"+
			"</tr>");	
	//	  }
	});              
	$("#files_len").html(size); 
}

function fill_collections_starred(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	//load_pagination("collections_search",size,cpage);
	$("#starred-collection-table tbody").empty();
	
	console.log(data.response.docs);
	$.each(data.response.docs, function(key, obj) {
	  if(user_data["FavoriteCollections"].includes(obj.id)){
		  var color = "btn-success";
	  
		  var thumb = "";
		  var filetype = obj.FileType ? obj.FileType.join(",") : "";
		  var description = obj.Description? obj.Description.join(",") : "";
		  if ('FileThumbnailUrl' in obj){
			thumb = "<img width='50' height='50' src='"+obj.FileThumbnailUrl+"'/>";
		  }
		  $("#starred-collection-table tbody").append(
			"<tr>"+
				"<td><div class=\"form-check\">"+
					"<label class=\"form-check-label\">"+
						"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
						"<span class=\"form-check-sign\"></span>"+
					"</label>"+
				"</div></td><td>"+
				"<a href=\"/labcas-ui/application/labcas_collection-detail_table.html?collection_id="+
						obj.id+"\">"+
					obj.CollectionName+"</a></td>"+
					"<td>"+obj.LeadPI+"</td>"+
					"<td>"+obj.Institution+"</td>"+
					"<td>"+obj.Discipline+"</td>"+
					"<td>"+obj.DataCustodian+"</td>"+
					"<td>"+obj.Organ+"</td>"+
				"<td class=\"td-actions text-right\">"+
					"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\"  onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections')\" class=\"btn "+color+" btn-simple btn-link\">"+
						"<i class=\"fa fa-star\"></i>"+
					"</button>"+
				"</td>"+
			"</tr>");	
		}
	});                                                                     
    $("#collections_len").html(size); 
    
}

function setup_labcas_starred(query, divid, cpage){
	var collection_starred_search = "";
	if (user_data["FavoriteCollections"].length > 0){
		collection_starred_search = "&fq=(id:"+user_data["FavoriteCollections"].join(" OR id:")+")";
	}
	var dataset_starred_search = "";
	if (user_data["FavoriteDatasets"].length > 0){
		dataset_starred_search = "&fq=(id:"+user_data["FavoriteDatasets"].join(" OR id:")+")";
	}
	var file_starred_search = "";
	if (user_data["FavoriteFiles"].length > 0){
		var tmp_files_search = user_data["FavoriteFiles"].join(" OR id:").replace(/ *\([^)]*\) */g, "*");
		file_starred_search = "&fq=(id:"+tmp_files_search+")";
	}
    console.log("Loading data...");
    if (divid == "collections_starred" || divid == "all"){
        console.log(Cookies.get('environment')+"/data-access-api/collections/select?q=*"+collection_starred_search+"&wt=json&indent=true&start="+cpage*10);
		$.ajax({
			url: Cookies.get('environment')+"/data-access-api/collections/select?q=*"+collection_starred_search+"&wt=json&indent=true&start="+cpage*10,	
			beforeSend: function(xhr) {
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
			},
			type: 'GET',
			dataType: 'json',
			success: function (data) {
				fill_collections_starred(data);
			},
			error: function(){
				 alert("Login expired, please login...");
				 window.location.replace("/labcas-ui/application/pages/login.html");
			 }
		});
    }
    if (divid == "datasets_starred" || divid == "all"){
        $.ajax({
            url: Cookies.get('environment')+"/data-access-api/datasets/select?q=*"+dataset_starred_search+"&wt=json&indent=true&start="+cpage*10,
            beforeSend: function(xhr) {
                if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
            },
            type: 'GET',
            dataType: 'json',
            processData: false,
            success: function (data) {
                fill_datasets_starred(data);
            },
            error: function(){
                 alert("Login expired, please login...");
                 //window.location.replace("/labcas-ui/application/pages/login.html");
             }
        });
    }
    
    if (divid == "files_starred" || divid == "all"){
    	console.log(Cookies.get('environment')+"/data-access-api/files/select?q=*"+file_starred_search+"&wt=json&indent=true&start="+cpage*10);
		
		$.ajax({
			url: Cookies.get('environment')+"/data-access-api/files/select?q=*"+file_starred_search+"&wt=json&indent=true&start="+cpage*10,
			xhrFields: {
					withCredentials: true
			  },
			beforeSend: function(xhr, settings) { 
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
			},
			dataType: 'json',
			success: function (data) {
			 console.log(data);
				fill_files_starred(data);
			},
			error: function(){
				 alert("Login expired, please login...");
				 //window.location.replace("/labcas-ui/application/pages/login.html");
			 
			 }
		});
	}
}

/* Starred Section End */
