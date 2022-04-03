var page_files = {};
var test_var;
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
function initiate_search(){
      var get_var = get_url_vars();
	console.log(localStorage.getItem("search"));
	if(localStorage.getItem("search")  && get_var["search"]){
        	localStorage.setItem("search", get_var["search"].replace("&","%26"));
		console.log("Search not clearned");
	}else{
		localStorage.setItem("search", "*");
		console.log("Search cleared");
	}
        $.each(localStorage.getItem("filters").split(","), function(ind, head) {
                var divs = localStorage.getItem(head+"_filters_div").split(",");
                $.each(divs, function(i, divhead) {
			if (!localStorage.getItem($.trim(divhead))){
				localStorage.setItem($.trim(divhead), "");
			}
                        if(divhead.includes("_num_")){
                                if (!localStorage.getItem($.trim(divhead)+"_0")){
                                        localStorage.setItem($.trim(divhead)+"_0","");
                                        localStorage.setItem($.trim(divhead)+"_1","");
                                        localStorage.setItem($.trim(divhead)+"_max_0","");
                                        localStorage.setItem($.trim(divhead)+"_max_1","");
                                }
                        }else{
                                if (!localStorage.getItem($.trim(divhead)+"_val")){
                                        localStorage.setItem($.trim(divhead)+"_val", "");
                                }
                        }
                });
        });

        setup_labcas_search(localStorage.getItem("search"), "all", 0);
        $("#collection_favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
}

function fill_collections_public_data(data){
	//data.response.docs.sort(dataset_compare_sort);
	$.each(data.response.docs, function(index, obj) {
		if ((!obj.QAState) || (obj.QAState && !obj.QAState.includes("Private"))){
			var color = "btn-info";
			if(user_data["FavoriteCollections"].includes(obj.id)){
				color = "btn-success";
			}
		
		
			var institutions = obj.Institution? obj.Institution.join(",") : "";
			var pis = obj.LeadPI? obj.LeadPI.join(",") : "";
			var orgs = obj.Organ? obj.Organ.join(",") : "";
		
			if (localStorage.getItem('environment').includes("edrn-labcas")){
				var obj_arr = generate_edrn_links(obj);
				protocols = obj_arr[3].join(",");
				orgs = obj_arr[2].join(",");
			}else if(localStorage.getItem('environment').includes("mcl-labcas") || localStorage.getItem('environment').includes("labcas-dev")){
				var obj_arr = generate_mcl_links(obj);
				protocols = obj_arr[3].join(",");
				orgs = obj_arr[2].join(",");
			}
			  $("#collection-table tbody").append(
				"<tr>"+
					"<td></td><td>"+
					"<a href=\"/labcas-ui/c/index.html?collection_id="+
						obj.id+"\">"+
					obj.CollectionName+"</a></td>"+
					"<td>"+orgs+"</td>"+
					"<td>"+obj.Discipline+"</td>"+
					"<td>"+institutions+"</td>"+
					"<td>"+pis+"</td>"+
					"<td class=\"td-actions\">"+
							"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
								"<i class=\"fa fa-star\"></i>"+
							"</button>"+
						"</td>"+
				"</tr>");
		}
    });
    $('#loading').hide(500);
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
function fill_collections_data(data){
	//data.response.docs.sort(dataset_compare_sort);
    $.each(data.response.docs, function(index, obj) {
    	var color = "btn-info";
	if(user_data["FavoriteCollections"].includes(obj.id)){
			color = "btn-success";
    	}
    	
		
		var institutions = obj.Institution? obj.Institution.join(", ") : "";
    	var pis = obj.LeadPI? obj.LeadPI.join(", ") : "";
    	var orgs = obj.Organ? obj.Organ.join(", ") : "";
    	var protocols = obj.ProtocolName? obj.ProtocolName.join(", ") : "";
    	
    	if (localStorage.getItem('environment').includes("edrn-labcas")){
			var obj_arr = generate_edrn_links(obj);
			protocols = obj_arr[3].join(", ");
			orgs = obj_arr[2].join(", ");
		}else if(localStorage.getItem('environment').includes("mcl-labcas") || localStorage.getItem('environment').includes("labcas-dev")){
			var obj_arr = generate_mcl_links(obj);
			protocols = obj_arr[3].join(", ");
			orgs = obj_arr[2].join(", ");
		}
		if (!protocols){
    		protocols = "";
    	}
    	
          $("#collection-table tbody").append(
            "<tr>"+
                "<td></td><td>"+
                "<a href=\"/labcas-ui/c/index.html?collection_id="+
                    obj.id+"\">"+
                obj.CollectionName+"</a></td>"+
                "<td>"+orgs+"</td>"+
                "<td>"+obj.Discipline+"</td>"+
                "<td>"+institutions+"</td>"+
                "<td>"+pis+"</td>"+
                "<td class=\"td-actions\">"+
						"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
							"<i class=\"fa fa-star\"></i>"+
						"</button>"+
					"</td>"+
            "</tr>");
    });
    $('#loading').hide(500);
    $table.bootstrapTable({
            toolbar: ".toolbar",
            clickToSelect: true,
            showRefresh: true,
            search: false,
            showToggle: true,
            showColumns: true,
            pagination: true,
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
function fill_collection_details_data(data){
    console.log("Fill collection details");
	//console.log(data);
        if(!data.response.docs[0]){
                if(!Cookies.get("token") || Cookies.get("token") == "None"){
	  	    localStorage.setItem("logout_alert","On");
		    alert("You are currently logged out. Redirecting you to log in.");
			redirect_to_login();
		}
        }
	var collectioname = data.response.docs[0].CollectionName;
    console.log("WHAT5");
	if (collectioname.length > 35){
		collectioname = collectioname.slice(0,35);
	}
	$("#collection_name").html(collectioname);
	var obj = data.response.docs[0];
	var institutions = obj.Institution? obj.Institution.join(", ") : "";
	var pis = obj.LeadPI? obj.LeadPI.join(", ") : "";
	var orgs = obj.Organ? obj.Organ.join(", ") : "";
	var proids = [];
	if (localStorage.getItem('environment').includes("edrn-labcas")){
		var obj_arr = generate_edrn_links(obj);
		protocols = obj_arr[3].join(",");
		orgs = obj_arr[2].join(", ");
                var proids = obj.ProtocolId? obj.ProtocolId : [];
                $.each(proids, function(ind, pid) {
                        get_protocol_info("2", pid, "shortname", populate_collection_details_protocol_shortname);
		});
	}else if(localStorage.getItem('environment').includes("mcl-labcas") || localStorage.getItem('environment').includes("labcas-dev")){
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
	obj.Consortium = obj.Consortium? "<a href='"+localStorage.getItem('environment_url')+"'>"+obj.Consortium+"</a>" : "";
	
	var extended_headers = [];
	if (localStorage.getItem('collection_header_extend_'+obj.id)){
		extended_headers = localStorage.getItem('collection_header_extend_'+obj.id).split(',');
	}
	var show_headers = localStorage.getItem('collection_header_order').split(',');
	var collapse_headers = localStorage.getItem('collapsible_headers').split(',');
	var collection_id_append = localStorage.getItem('collection_id_append').split(',');
	
	$.each(show_headers, function(ind, head) {
		var value = obj[head];
		if (typeof  value === "undefined") {
			value = "";
		}
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
            if (value && value.length > 20){
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
		if (show_headers.includes(key) || !extended_headers.includes(key)){
			return;
		}
		if (typeof  value === "undefined") {
                        value = "";
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

	$('#loading_collection').hide(500);    
	$("#collectiontitle").html(collectioname);


}
function fill_dataset_details_data(data){
	var datasetname = data.response.docs[0].DatasetName;
	$("#datasettitle").html(datasetname);
	if (datasetname.length > 25){
		datasetname = datasetname.slice(0,25);
	}
    console.log("WH1");
    setTimeout(function() {
        $("#collection_datasets_len").html(datasetname);
    }, 2000);
	
	var collectionid = data.response.docs[0].CollectionId;
	var collectionname = data.response.docs[0].CollectionName;
	$("#collection_name").html("<a href=\"/labcas-ui/c/index.html?collection_id="+collectionid+"\">"+collectionname+"</a>");
	
	var extended_headers = [];
        if (localStorage.getItem('dataset_header_extend_'+collectionid)){
                extended_headers = localStorage.getItem('dataset_header_extend_'+collectionid).split(',');
        }
    var show_headers = localStorage.getItem('dataset_header_order').split(',');
    var collection_id_append = localStorage.getItem('dataset_id_append').split(',');
	
	$.each(show_headers, function(ind, head) {
        var value = data.response.docs[0][head];
	if (typeof  value === "undefined") {
                        value = "";
                }
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
		if (show_headers.includes(key) || !extended_headers.includes(key)){
		    return;
		}
		if (typeof  value === "undefined") {
                        value = "";
                }
		if ($.isArray(value)){
			value = value.join(",");
		}
		if (typeof value == "string"){
			value = value.replace(/% /g,'_labcasPercent_');
			try { 
				value = decodeURIComponent(value);
			} catch(e) { 
			  console.error(e); 
			}
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
function fill_ksdb_info(type, id){
	$.ajax({
        url: localStorage.getItem(type),
        type: 'GET',
        success: function (data) {
		console.log("HERE");
		console.log(data);
            data = JSON.parse(data);
	    $("#"+type+id+"").html(data[site][1]);

        },
        error: function(e){
            if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
               localStorage.setItem("logout_alert","On");
                alert("You are currently logged out. Redirecting you to log in.");
            }
	 }
    });
}
function fill_file_details_data(data){
	$("#filetitle").html(data.response.docs[0].FileName);
	var html_safe_id = encodeURI(escapeRegExp(data.response.docs[0].id)).replace("&","%26");
	var fileurl = "";
	if (data.response.docs[0].FileUrl){
		var url = data.response.docs[0].FileUrl;
		fileurl = "<a href='"+url+"'>"+url+"</a>";
	}
	var filesize = "";
	if (data.response.docs[0].FileSize){
		filesize = humanFileSize(data.response.docs[0].FileSize, true);
	}
	$.each(data.response.docs[0], function(key, value) {
		if (key == "_version_"){
			return;
		}
		if ($.isArray(value)){
			value = value.join(",");
		}
		if (key == "FileUrl"){
			value = fileurl;
		}
		if (key == "FileSize"){
			value = filesize;
		}
		if (key == "SubmittingInvestigatorID"){
			$("#filedetails-table tbody").append(
			    "<tr>"+
				"<td class='text-right'  valign='top' style='padding: 2px 8px;' width='20%'>"+key.replace( /([A-Z])/g, " $1" ).replace(" I D", " ID").replace(" P I"," PI").replace(/_/g," ")+":</td>"+
				"<td class='text-left' valign='top' style='padding: 2px 8px;'><span id='SubmittingInvestigatorIDSpan"+value+"'>"+
					value+
				"</span></td>"+
			"</tr>");
			//fill_ksdb_info("ksdb_institution_site_api", value);
		}else{
			$("#filedetails-table tbody").append(
			    "<tr>"+
				"<td class='text-right'  valign='top' style='padding: 2px 8px;' width='20%'>"+key.replace( /([A-Z])/g, " $1" ).replace(" I D", " ID").replace(" P I"," PI").replace(/_/g," ")+":</td>"+
				"<td class='text-left' valign='top' style='padding: 2px 8px;'>"+
					value+
				"</td>"+
			"</tr>");
		}
    });
    $("#filesize").html(filesize); 
    $("#download_icon").attr("onclick","download_file('"+html_safe_id+"','single');");

		console.log("HERHEREfirst");
	if (accepted_image_check(data.response.docs[0].FileName)){
		console.log("HERHERE");
		var filename = data.response.docs[0].FileName ? data.response.docs[0].FileName : "";
                var version = data.response.docs[0].DatasetVersion ? data.response.docs[0].DatasetVersion : "";
                var fileloc = data.response.docs[0].FileLocation ? data.response.docs[0].FileLocation : "";
		if ('ThumbnailRelativePath' in data.response.docs[0]){
                        thumb = "<img width='50' height='50' src='"+localStorage.getItem('environment')+"/labcas-ui/assets/"+data.response.docs[0].ThumbnailRelativePath+"'/>";
			$("#viewer_wrapper").html(thumb);
			$("#viewer_wrapper").attr("onclick","submitSingleImageData('"+html_safe_id+"','"+fileloc+"','"+filename+"','"+version+"');");
		}else{
			$("#viewer_icon").attr("onclick","submitSingleImageData('"+html_safe_id+"','"+fileloc+"','"+filename+"','"+version+"');");
                }
        if (check_image_filtered_dataset(html_safe_id)){
            $('#image_viewer_link').show();
        }
	}

	$('#loading').hide(500);
}
function fill_file_image_viewer_data(data){
	$("#filetitle").html(data.response.docs[0].FileName);

	var html_safe_id = encodeURI(escapeRegExp(data.response.docs[0].id)).replace("&","%26");
	var fileurl = "";
	if (data.response.docs[0].FileUrl){
		var url = data.response.docs[0].FileUrl;
		fileurl = "<a href='"+url+"'>"+url+"</a>";
	}
	var filesize = "";
	if (data.response.docs[0].FileSize){
		filesize = humanFileSize(data.response.docs[0].FileSize, true);
	}
	//$("#download_icon").attr("onclick","download_file('"+html_safe_id+"','single');");
	console.log("GOTHERE");
	if (accepted_image_check(data.response.docs[0].FileName)){
		var filename = data.response.docs[0].FileName ? data.response.docs[0].FileName : "";
        var version = data.response.docs[0].DatasetVersion ? data.response.docs[0].DatasetVersion : "";
        var fileloc = data.response.docs[0].FileLocation ? data.response.docs[0].FileLocation : "";
		var image_list = [];

		var histomics_list = [];
		var image_type = "image";
		//image_list.push(localStorage.getItem('environment')+"/data-access-api/download?id="+html_safe_id);

		var h_list = localStorage.getItem("image_data");
		if (h_list){
			histomics_list = JSON.parse(h_list);
		}
		if (filename.endsWith(".dcm") || filename.endsWith(".dicom")){
		    image_type = "dicoms";
		}

		localStorage.setItem("image_data",JSON.stringify(histomics_list));
		show_flag = true;

		orchistrate_find(fileloc,filename,version, show_flag, html_safe_id);
		$.each(histomics_list, function( key, val ) {
		  if (val[3] != html_safe_id){
			  show_flag = false;
			  orchistrate_find(val[0], val[1], val[2], show_flag, val[3]);
		  }
       });
	}
}



function fill_datasets_children(data){
	data.response.docs.sort(dataset_compare_sort);
        var dataset_html = "";
        var flag = "";
        var dataset_count = 0;
        $.each(data.response.docs, function(key, value) {
			if (flag == ""){
				flag = true;
				return;
			}
                        var color = "#0000FF";
                        if(user_data["FavoriteDatasets"].includes(value.id)){
                                color = "#87CB16 !important";
                        }       
			value.DatasetName = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(value.id.split("/").length - 2)+"<span>&#8226;</span>"+value.DatasetName;

			var html_safe_id = encodeURI(escapeRegExp(value.id));
			var id_safe_id = html_safe_id.replace(/\//g,"-labsep-");
			var image_div = "";
			if (value.contains_image){
				image_div = "<button id='view_"+id_safe_id+"' type=\"button\" rel=\"tooltip\" title=\"View\" onclick=\"Cookies.set('login_redirect', '/labcas-ui/d/index.html?dataset_id="+html_safe_id+"'); submitImage('files-table','"+html_safe_id+"')\" class=\"btn btn-simple btn-link\" style='position: absolute;left: -50px; top: 50%; transform: translateY(-50%); color: red'>"+
					"<i class=\"fa fa-image\"></i>"+
				"</button>";
			}

			dataset_html += "<div class='row' style='border-bottom:1px solid #ccc; margin-left: 0px; margin-right: 0px;'>"+
                                        "<div class='col-md-1'><!--<div class=\"form-check\">"+
                                                "<label class=\"form-check-label\">"+
                                                        "<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
                                                        "<span class=\"form-check-sign\"></span>"+
                                                "</label>"+
                                        "</div>--></div>"+
                                        "<div class='text-left col-md-10' valign='middle' style='padding: 0px 8px; vertical-align: middle;'>"+
                        "<a href=\"/labcas-ui/d/index.html?dataset_id="+
                            value.id+"\">"+
                            value.DatasetName+
                        "</a>"+
                                        "</div>"+
                                        "<div class=\"td-actions col-md-1 text-right\" valign='middle' style='padding: 0px 8px; vertical-align: middle; height: 25px'>"+
						image_div+
                                                "<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+value.id+"', 'FavoriteDatasets', this)\" class=\"btn btn-simple btn-link\" style='position: absolute;left: 5px; top: 50%; transform: translateY(-50%); color: "+color+"'>"+
                                                        "<i class=\"fa fa-star\"></i>"+
                                                "</button>"+
                                        "</div>"+
                                "</div>";
                    dataset_count += 1;
                });
	if ( dataset_html != ""){
		$("#children-datasets").show();
        $( "#dataset_stat_template" ).load("/labcas-ui/templates.html #dataset_stat_template");
        console.log("OKOK1");
        setTimeout(function() { 
            $("#collection_datasets_len").html(dataset_count);
        }, 2000);
	}else{
        $( "#dataset_stat_template" ).load("/labcas-ui/templates.html?version=2.3.2 #dataset_name_template");
    }
        $("#children-datasets-section").append(dataset_html);
}
function fill_collection_level_files(data){
	console.log("Metadata size");
	var size = data.response.numFound;
	console.log(size);
        var cpage = data.response.start;
        load_pagination("collectionfiles",size,cpage);
        $("#files-table tbody").empty();
        var download_list = JSON.parse(localStorage.getItem("download_list"));
	var cart_list = JSON.parse(localStorage.getItem("cart_list"));
        $.each(data.response.docs, function(key, value) {

                var color = "btn-info";
                if(user_data["FavoriteFiles"].includes(value.id)){
                        color = "btn-success";
                }

                var thumb = "";
                var filetype = value.FileType ? value.FileType.join(",") : "";
                var filename = value.FileName ? value.FileName : "";
                var version = value.DatasetVersion ? value.DatasetVersion : "";
                var fileloc = value.FileLocation ? value.FileLocation : "";
                var site = value.Institution ? value.Institution.join(",") : "";
                var description = value.Description? value.Description.join(",") : "";
                if ('ThumbnailRelativePath' in value){
                        thumb = "<img width='50' height='50' src='"+localStorage.getItem('environment')+"/labcas-ui/assets/"+value.ThumbnailRelativePath+"'/>";
                }
                var html_safe_id = encodeURI(escapeRegExp(value.id));
                var filesize = "";
                var filesizenum = 0;
                if (value.FileSize){
                        filesize = humanFileSize(value.FileSize, true);
                        filesizenum = value.FileSize;
                }
                var checked = "";
		if ( (download_list &&  html_safe_id in download_list) || (cart_list && html_safe_id in  cart_list)){
                        checked = "checked";
                }
                $("#files-table tbody").append(
                "<tr>"+
                        "<td><center><input type='checkbox' class='form-check-input' data-loc='"+fileloc+"' data-name='"+filename+"' data-version='"+version+"' value='"+html_safe_id+"' "+checked+" data-valuesize='"+filesizenum+"'></center></td>"+
                        "<td class='text-left'>"+
                                "<a href=\"/labcas-ui/f/index.html?file_id="+
                                        html_safe_id+"\">"+
                                        value.FileName+
                                "</a>"+
                        "</td>"+
                        "<td class='text-left'>"+
                                        site +
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
                                        filesize+
                        "</td>"+
                        "<td class=\"td-actions text-right\">"+
                                "<button type=\"button\" rel=\"favoritebutton\" title=\"Favorite\" onclick=\"save_favorite('"+value.id+"', 'FavoriteFiles', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
                                        "<i class=\"fa fa-star\"></i>"+
                                "</button>"+
                                "<button type=\"button\" rel=\"downloadbutton\" title=\"Download\" class=\"btn btn-danger btn-simple btn-link\" onclick=\"download_file('"+html_safe_id+"','single')\">"+
                                        "<i class=\"fa fa-download\"></i>"+
                                "</button>"+
                        "</td>"+
                "</tr>");
        });
    if (size > 0){
	$("#children-files").show();
    }
	$('#loading_file').hide(500);
    init_file_checkboxes("files-table");
}
function fill_collection_metadata(data){
	
	var dataset_metadata_html = '<table class="table" id="metadatadetails-table" style="table-layout: fixed;">';
	$.each(data.response.docs, function(key, value) {
		console.log(key);
		console.log(value.id);
		var html_safe_id = encodeURI(escapeRegExp(value.id));
		console.log(html_safe_id);
		dataset_metadata_html+="<tr>"+
                                "<td valign='top' style='padding: 2px 8px;' width='80%'>"+"<a href='/labcas-ui/f/index.html?file_id="+html_safe_id+"'>"+value.FileName+"</a>"+"</td>"+
                                "<td valign='top' style='padding: 2px 8px;' width='20%'>"+"<center><a href='#' onclick=\"download_file('"+html_safe_id+"','single');\">"+"<i class=\"fa fa-download\"></i>"+"</a></center>"+"</td>"+
				"</tr>"
	});
	dataset_metadata_html += "</table>";
	$('#loading_metadata').hide(500);
	$('#metadata_div').html(dataset_metadata_html);
}
function fill_datasets_data(data){
	
	data.response.docs.sort(dataset_compare_sort);
	var collapse_dict = {};
	var image_check_datasets = {};
	var prev_dataset_id = "";
	var dataset_html = "";
	var dataset_attr ="";
	var collapse_button = "";

        var get_var = get_url_vars();
        var metadata_exists = false;
        var collection_file_exists = false;


	$.each(data.response.docs, function(key, value) {
		if (value.id.split(/\//)[1] == get_var["collection_id"]){
			query_labcas_api(localStorage.getItem('environment')+"/data-access-api/files/select?q=DatasetId:"+value.id+"&wt=json&sort=FileName%20asc&indent=true", fill_collection_level_files);
			collection_file_exists = true;
			return;
		}
		else if(value.id.split(/\//)[1].toLowerCase() == "documentation"){
			query_labcas_api(localStorage.getItem('environment')+"/data-access-api/files/select?q=DatasetId:"+value.id+"&wt=json&sort=FileName%20asc&indent=true", fill_collection_metadata);
			metadata_exists = true;
			return;
		}
		var html_safe_id = encodeURI(escapeRegExp(value.id));
		var id_safe_id = html_safe_id.replace(/\//g,"-labsep-");

		var color = "#0000FF";

		var image_div = "";
		if (value.contains_image){
			image_div = "<button id='view_"+id_safe_id+"' type=\"button\" rel=\"tooltip\" title=\"View\" onclick=\"Cookies.set('login_redirect', '/labcas-ui/d/index.html?dataset_id="+html_safe_id+"'); submitImage('files-table','"+html_safe_id+"')\" class=\"btn btn-simple btn-link\" style='position: absolute;left: -50px; top: 50%; transform: translateY(-50%); color: red'>"+
				"<i class=\"fa fa-image\"></i>"+
			"</button>";
		}

		if(user_data["FavoriteDatasets"].includes(value.id)){
			color = "#87CB16 !important";
		}
		if (value.id.split("/").length - 2 > 0){
			if (collapse_dict[prev_dataset_id] == 1){
				dataset_html += "<div id='"+prev_dataset_id+"' class='collapse'>";
				collapse_dict[prev_dataset_id] += 1;
			}
			value.DatasetName = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(value.id.split("/").length - 2)+"<span>&#8226;</span>"+value.DatasetName;
			collapse_button = "";
		}else{
			if (prev_dataset_id != ""){
				dataset_html += "</div>";
			}
			prev_dataset_id = value.id.replace(/[\/,\.]/g,"_");
			collapse_button = '<button id="'+prev_dataset_id+'_button" style="height:25px; position: absolute; top: 30%; transform: translateY(-50%);" type="button" class="btn btn-link" data-toggle="collapse" data-target="#'+prev_dataset_id+'"><i class="fa fa-plus"></i></button>';
			collapse_dict[prev_dataset_id] = 1;
		}
		dataset_html += "<div class='row' style='border-bottom:1px solid #ccc; margin-left: 0px; margin-right: 0px;'>"+
				"<div class='col-md-1'><!--<div class=\"form-check\">"+
					"<label class=\"form-check-label\">"+
						"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
						"<span class=\"form-check-sign\"></span>"+
					"</label>"+
				"</div>-->"+collapse_button+"</div>"+
				"<div class='text-left col-md-10' valign='middle' style='padding: 0px 8px; vertical-align: middle;'>"+
		"<a href=\"/labcas-ui/d/index.html?dataset_id="+
		    value.id+"\">"+
		    value.DatasetName+
		"</a>"+
				"</div>"+
				"<div class=\"td-actions col-md-1 text-right\" valign='middle' style='padding: 0px 8px; vertical-align: middle; height: 25px'>"+
					"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+value.id+"', 'FavoriteDatasets', this)\" class=\"btn btn-simple btn-link\" style='position: absolute;left: -100px; top: 50%; transform: translateY(-50%); color: "+color+"'>"+
						"<i class=\"fa fa-star\"></i>"+
					"</button>"+
					image_div +
					"<button type=\"button\" rel=\"downloadbutton\" title=\"Download\" class=\"btn btn-danger btn-simple btn-link\" onclick=\"download_dataset('"+html_safe_id+"')\" style='position: absolute;left: 0px; top: 50%; transform: translateY(-50%); color: green;'>"+
                                        "<i class=\"fa fa-download\"></i>"+
					"</button>"+
				"</div>"+
			"</div>";
	});                                                                     
	if (!metadata_exists){
                $('#collection_level_files').hide();
        }
	if (!collection_file_exists){
                $('#children-files').hide();
        }
	if ( dataset_html == "" ){
		$('#datasets_in_collection').hide();
	}
	if (prev_dataset_id != ""){
		dataset_html += "</div>";
	}

	$("#datasets-table").append(dataset_html);
	$.each(collapse_dict, function(key, value) {
		if (value == 1){
			$('#'+key+'_button').hide();
		}
	});
	/*$.each(image_check_datasets, function(key, value) {
		//console.log(localStorage.getItem('environment')+"/data-access-api/files/select?q=DatasetId:"+key+"AND"+generate_accepted_image_solr_filters()+"&wt=json&sort=FileName%20asc&indent=true");
		query_labcas_api(localStorage.getItem('environment')+"/data-access-api/files/select?q=DatasetId:"+key+"AND"+generate_accepted_image_solr_filters()+"&wt=json&sort=FileName%20asc&indent=true", checkDatasetContainsDicom.bind(null, key, value));
	});*/
	    $("#collection_datasets_len").html(data.response.numFound); 
	    $("#collection_favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
	$('#loading_dataset').hide(500);
	$('#loading_metadata').hide(500);
	
}
function fill_files_data(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	load_pagination("files",size,cpage);
	$("#files-table tbody").empty();
	var download_list = JSON.parse(localStorage.getItem("download_list"));
	var cart_list = JSON.parse(localStorage.getItem("cart_list"));
	$.each(data.response.docs, function(key, value) {
	
		var color = "btn-info";
		if(user_data["FavoriteFiles"].includes(value.id)){
			color = "btn-success";
		}
		
		var thumb = "";
		var filetype = value.FileType ? value.FileType.join(",") : "";
        var filename = value.FileName ? value.FileName : "";
        var version = value.DatasetVersion ? value.DatasetVersion : "";
        var fileloc = value.FileLocation ? value.FileLocation : "";
		var site = value.Institution ? value.Institution.join(",") : "";
		var parID = value.participantID ? value.participantID.join(",") : "";
		var speID = value.specimen_id ? value.specimen_id.join(",") : "";
		var description = value.Description? value.Description.join(",") : "";
		if ('ThumbnailRelativePath' in value){
			thumb = "<img width='50' height='50' src='"+localStorage.getItem('environment')+"/labcas-ui/assets/"+value.ThumbnailRelativePath+"'/>";
		}
		var html_safe_id = encodeURI(escapeRegExp(value.id)).replace("&","%26");
		var filesize = "";
		var filesizenum = 0;
		if (value.FileSize){
			filesize = humanFileSize(value.FileSize, true);
			filesizenum = value.FileSize;
		}
		var checked = "";
		if ( (download_list &&  html_safe_id in download_list) || (cart_list &&  html_safe_id in cart_list)){
			checked = "checked";
		}
		$("#files-table tbody").append(
		"<tr>"+
			"<td><center><input type='checkbox' class='form-check-input' data-loc='"+fileloc+"' data-name='"+filename+"' data-version='"+version+"' value='"+html_safe_id+"' "+checked+" data-valuesize='"+filesizenum+"'></center></td>"+
			"<td class='text-left' style='padding-right: 10px'>"+
				"<a href=\"/labcas-ui/f/index.html?file_id="+
					html_safe_id+"\">"+
					value.FileName+
				"</a>"+
			"</td>"+
			"<td class='text-left'>"+
					parID +
			"</td>"+
			"<td class='text-left'>"+
					speID +
			"</td>"+
			"<td class='text-left'>"+
					site +
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
					filesize+
			"</td>"+
			"<td class=\"td-actions text-right\">"+
				"<button type=\"button\" rel=\"favoritebutton\" title=\"Favorite\" onclick=\"save_favorite('"+value.id+"', 'FavoriteFiles', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
				"<button type=\"button\" rel=\"downloadbutton\" title=\"Download\" class=\"btn btn-danger btn-simple btn-link\" onclick=\"download_file('"+html_safe_id+"','single')\">"+
					"<i class=\"fa fa-download\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});                                                                     
    $("#collection_files_len").html(size); 
    $("#collection_favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
    $('#loading_file').hide(500);
    if (size > 0){
	$("#children-files").show();
    }
    init_file_checkboxes("files-table");
}

function setup_labcas_data(datatype, query, dataset_query){	
    $.ajax({
        url: localStorage.getItem('environment')+"/data-access-api/collections/select?q="+query+"&wt=json&indent=true&rows=10000&sort=id%20asc",
        beforeSend: function(xhr) { 
        	if(Cookies.get('token') && Cookies.get('token') != "None"){
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
			url: localStorage.getItem('environment')+"/data-access-api/files/select?q="+dataset_query+"&wt=json&sort=FileName%20asc&indent=true",
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
			error: function(e){
				if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
				   localStorage.setItem("logout_alert","On");
				    alert("You are currently logged out. Redirecting you to log in.");
				}
				redirect_to_login();
			 }
		});
            }
        },
        error: function(e){
		if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                     localStorage.setItem("logout_alert","On");
		     alert("You are currently logged out. Redirecting you to log in.");
		}
		redirect_to_login();
         }
    });
    if (datatype == "collectiondatasets"){
	console.log(localStorage.getItem('environment')+"/data-access-api/datasets/select?q="+dataset_query+"&wt=json&indent=true&rows=20000");
    	$.ajax({
		url: localStorage.getItem('environment')+"/data-access-api/datasets/select?q="+dataset_query+"&wt=json&indent=true&rows=20000",
		beforeSend: function(xhr) { 
			if(Cookies.get('token') && Cookies.get('token') != "None"){
				xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
			}
		},
		type: 'GET',
		dataType: 'json',
		processData: false,
		success: function (data) {
			fill_datasets_data(data);
		},
		error: function(e){
			if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
				   localStorage.setItem("logout_alert","On");
				 alert("You are currently logged out. Redirecting you to log in.");
			}
			redirect_to_login();
		}
	});
    }
}
function populate_dataset_children(query){
	query = query.replace(/id:/,'DatasetParentId')+"%5C%2A";
	console.log(localStorage.getItem('environment')+"/data-access-api/datasets/select?q="+query+"&wt=json&indent=true&rows=20000&sort=id%20asc");
	$.ajax({
		url: localStorage.getItem('environment')+"/data-access-api/datasets/select?q="+query+"&wt=json&indent=true&rows=20000&sort=id%20asc",
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
			fill_datasets_children(data);

		},
		error: function(e){
			if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
			   localStorage.setItem("logout_alert","On");
			    alert("You are currently logged out. Redirecting you to log in.");
			}
			redirect_to_login();

		 }
	});
	$('#loading_dataset').hide(500);
}
function setup_labcas_dataset_data(datatype, query, file_query, cpage){
    if (cpage == 0){ //if this isn't a pagination request and a default load
	console.log(localStorage.getItem('environment')+"/data-access-api/datasets/select?q="+query+"&wt=json&indent=true");
	$.ajax({
		url: localStorage.getItem('environment')+"/data-access-api/datasets/select?q="+query+"&wt=json&indent=true",
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
			try{
				fill_dataset_details_data(data);
				populate_dataset_children(query);
			} catch (ex) {
				if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
				   localStorage.setItem("logout_alert","On");
				     alert("You are currently logged out. Redirecting you to log in.");
				}
				redirect_to_login();
			}

		},
		error: function(e){
			if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
			   localStorage.setItem("logout_alert","On");
			    alert("You are currently logged out. Redirecting you to log in.");
			}
			redirect_to_login();
		 
		 }
	});
    }
    //Set dataset size
    
    console.log(localStorage.getItem('environment')+"/data-access-api/files/select?q="+file_query+"&wt=json&indent=true&sort=FileName%20asc&start="+cpage*10);
    $.ajax({
        url: localStorage.getItem('environment')+"/data-access-api/files/select?q="+file_query+"&wt=json&indent=true&sort=FileName%20asc&start="+cpage*10,
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
        error: function(e){
		if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                                   localStorage.setItem("logout_alert","On");
			     alert("You are currently logged out. Redirecting you to log in.");
		}
		redirect_to_login();
             
         }
    });
}

function setup_labcas_file_data(datatype, query, file_query){
	console.log("QUERY");
	console.log(query);

    //Url encode just in case
//query = query.replace("+","%5C%2B");

	console.log("Escaped2");
	console.log(query);
	console.log(localStorage.getItem('environment')+"/data-access-api/files/select?q="+query+"&wt=json&sort=FileName%20asc&indent=true");

    $.ajax({
        url: localStorage.getItem('environment')+"/data-access-api/files/select?q="+query+"&wt=json&sort=FileName%20asc&indent=true",
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
	    try {
		if (datatype == "file"){
			fill_file_details_data(data);
		}else if(datatype == "fileimage"){
			fill_file_image_viewer_data(data);
		}

	    } catch (ex) {
		if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                   localStorage.setItem("logout_alert","On");
                     alert("You are currently logged out. Redirecting you to log in.");
                }
		redirect_to_login();
	    }
        },
        error: function(e){
		if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
		   localStorage.setItem("logout_alert","On");
		     alert("You are currently logged out. Redirecting you to log in.");
		}
		
		redirect_to_login();
             
         }
    });
}




/*Search Section*/

function fill_datasets_facets(data){
	//console.log("Data_facets_output");
	//console.log(data);
}

function fill_datasets_search(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	load_pagination("datasets_search",size,cpage);
	//console.log("datasets");
	//console.log(data);
	$("#search-dataset-table tbody").empty();

	//console.log(data);
	$.each(data.response.docs, function(key, obj) {
	  var color = "btn-info";
	  if(user_data["FavoriteDatasets"].includes(obj.id)){
			color = "btn-success";
	  }
	var html_safe_id = encodeURI(escapeRegExp(obj.id));
	var id_safe_id = html_safe_id.replace(/\//g,"-labsep-");
	var image_div = "";
	if (obj.contains_image){
		image_div = "<button id='view_"+id_safe_id+"' type=\"button\" rel=\"tooltip\" title=\"View\" onclick=\"Cookies.set('login_redirect', '/labcas-ui/d/index.html?dataset_id="+html_safe_id+"'); submitImage('files-table','"+html_safe_id+"')\" class=\"btn btn-simple btn-link\" style='color: red'>"+
			"<i class=\"fa fa-image\"></i>"+
		"</button>";
	}


	  $("#search-dataset-table tbody").append(
		"<tr>"+
			"<td>"+
			"<a href=\"/labcas-ui/d/index.html?dataset_id="+
                    obj.id+"\">"+
                obj.DatasetName+"</a></td>"+
                "<td><a href=\"/labcas-ui/c/index.html?collection_id="+
                    obj.CollectionId+"\">"+
                    	obj.CollectionName+"</a></td>"+
                "<!--<td>"+obj.DatasetVersion+"</td>-->"+
			"<td class=\"td-actions\">"+
				image_div+
				"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteDatasets', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});                

	$("#collection_datasets_len").html(size); 
	$('#loading_dataset').hide(500);
}

function fill_files_facets(data){
	
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
	  var filename = obj.FileName ? obj.FileName : "";
      var version = obj.DatasetVersion ? obj.DatasetVersion : "";
      var fileloc = obj.FileLocation ? obj.FileLocation : "";

	  var site = obj.Institution ? obj.Institution.join(",") : "";
	  var description = obj.Description? obj.Description.join(",") : "";
	  if ('ThumbnailRelativePath' in obj){
		thumb = "<img width='50' height='50' src='"+localStorage.getItem('environment')+"/labcas-ui/assets/"+obj.ThumbnailRelativePath+"'/>";
  	  }
	  var filesize = "";
	  var filesizenum = 0;
	  if (obj.FileSize){
  		filesize = humanFileSize(obj.FileSize, true);
		filesizenum += parseInt(obj.FileSize);
          }
	  var html_safe_id = encodeURI(escapeRegExp(obj.id)).replace("&","%26");
	  var checked = "";
	  var download_list = JSON.parse(localStorage.getItem("download_list"));
	  var cart_list = JSON.parse(localStorage.getItem("cart_list"));
	  //console.log(html_safe_id);
	  //console.log(download_list);
	  if ( (download_list &&  html_safe_id in download_list) || (cart_list &&  html_safe_id in cart_list)){
		checked = "checked";
      	  }

	  $("#search-file-table tbody").append(
		"<tr>"+
			"<td><center><input type='checkbox' class='form-check-input' data-loc='"+fileloc+"' data-name='"+filename+"' data-version='"+version+"' value='"+html_safe_id+"' data-valuesize='"+filesizenum+"' "+checked+"></center></td>"+
			"<td class='text-left'>"+
				"<a href=\"/labcas-ui/f/index.html?file_id="+
					html_safe_id+"\">"+
					obj.FileName+
				"</a>"+
			"</td>"+
			"<td class='text-left'>"+
					filetype +
			"</td>"+
			"<td class='text-left'>"+
					site +
			"</td>"+
			"<td class='text-left'>"+
					description +
			"</td>"+
			"<td class='text-left'>"+
					thumb+
			"</td>"+
			"<td class='text-left'>"+
					filesize+
			"</td>"+
			"<td class=\"td-actions\">"+
				"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteFiles', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});              
	$("#collection_files_len").html(size); 
	$('#loading_file').hide(500);
	//Init shopping cart
	init_file_checkboxes("search-file-table");
}
function generate_filters(field_type, placeholder, data, display, head){
	var filters = [];
	var counts = [];

	$("#filter_options").append(
		'<div class="card-header '+head+'_card">'+
		    '<h5 class="card-title">'+display+'</h5>'+
		    '<hr style="margin-top: .5em; margin-bottom: 0">'+
		'</div>'+
		'<div id="'+placeholder+'_card" class="card-body '+head+'_card" style="padding: 0px 15px 10px 15px; height: 20px; overflow-y: auto;">'+
		       '<form id="'+placeholder+'">'+
			'</form>'+
		'</div>'
	);

	$("#"+placeholder).html("");

	//console.log(data);
	if (placeholder.includes("_num_")){
		var min = 100000000;
		var max = -1;
		var left = 0;
		var right = 100;
		var sum = 0;
		var addflag = false;
		$.each(data, function(key, obj) {
                    if (Number.isInteger(obj)){
			if(addflag){
				sum += obj;
			}
                    }else{
			if(!isNaN(obj)){
				if(min > +obj){
					min = +obj;
				}
				if (max < +obj){
					max = +obj;
				}
				if(((localStorage.getItem(placeholder+"_0") && localStorage.getItem(placeholder+"_0") <= +obj) || (!localStorage.getItem(placeholder+"_0")))
					&& (localStorage.getItem(placeholder+"_1") && localStorage.getItem(placeholder+"_1") >= +obj) || (!localStorage.getItem(placeholder+"_1"))){
					addflag = true;
				}else{
					addflag = false;
				}
			}
                    }
                });
		if (min != 100000000 && max != -1){
			if (localStorage.getItem(placeholder+"_max_0")){
				min = localStorage.getItem(placeholder+"_max_0");
			}else{
				localStorage.setItem(placeholder+"_max_0", Math.floor(min));
				left = min;
			}
			if (localStorage.getItem(placeholder+"_max_1")){
				max = localStorage.getItem(placeholder+"_max_1");
			}else{
				localStorage.setItem(placeholder+"_max_1", Math.floor(max));
				right = max;
			}
			if (localStorage.getItem(placeholder+"_0")){
				left = localStorage.getItem(placeholder+"_0");
			}else{
				localStorage.setItem(placeholder+"_0", Math.floor(min));
				left = min;
			}
			if (localStorage.getItem(placeholder+"_1")){
				right = localStorage.getItem(placeholder+"_1");
			}else{
				localStorage.setItem(placeholder+"_1", Math.floor(max));
				right = max;
			}
			$("#"+placeholder).append($('<div class="row"><div class="col-md-12" id="'+placeholder+'_count" style="text-align: center"></div></div><div class="row"><div class="col-md-2" style="text-align: left;" id="'+placeholder+'_0"></div><div class="col-md-8"><div id="'+placeholder+'_slider" class="slider-success"></div></div><div class="col-md-2"  style="text-align: right;" id="'+placeholder+'_1"></div></div>'));
			
			var slider = document.getElementById(placeholder+'_slider');

			var slider_left = document.getElementById(placeholder+'_0');
			var slider_right = document.getElementById(placeholder+'_1');
			noUiSlider.create(slider, {
			    start: [left, right],
			    connect: true,
			    range: {
				min: +min,
				max: +max
			    },
			    step: 1
			});
			document.getElementById(placeholder+'_count').innerHTML = "("+sum+")";
			slider.noUiSlider.on('update', function (values, handle) {
			    if (handle == 0){
				slider_left.innerHTML = Math.floor(values[handle]);
			    }else if(handle == 1){
				slider_right.innerHTML = Math.floor(values[handle]);
			    }
			});
			slider.noUiSlider.on('end', function (values, handle) {
			    if (handle == 0){
				localStorage.setItem(placeholder+"_0", Math.floor(values[handle]));
			    }else if(handle == 1){
				localStorage.setItem(placeholder+"_1", Math.floor(values[handle]));
			    }

			    var str_field_val = encodeURI("["+localStorage.getItem(placeholder+"_0")+" TO "+localStorage.getItem(placeholder+"_1")+"]");
			    var field_search = "&fq="+encodeURI(escapeRegExp(field_type)).replace(/:/g,'%3A')+":"+str_field_val;
			    if (localStorage.getItem(placeholder+"_0") == localStorage.getItem(placeholder+"_max_0") && localStorage.getItem(placeholder+"_1") == localStorage.getItem(placeholder+"_max_1")){
				field_search = "";
			    }
			    localStorage.setItem(placeholder, field_search);
			    localStorage.setItem("search_filter", "on");
			    setup_labcas_search(localStorage.getItem('search').replace("&","%26"), "all", 0);
			});
			$('#'+placeholder+'_card').css("height","100px");
		}

	}else{
		$.each(data, function(key, obj) {
		    if (Number.isInteger(obj)){
			counts.push(obj);
		    }else{
			filters.push(obj);
		    }
		});
                var filter_count = 0;
		$.each(filters, function(i, o){
			if (localStorage.getItem(placeholder+"_val") && localStorage.getItem(placeholder+"_val") != ""){
			}
		    if (counts[i] > 0){
			var checked = "";
			if (localStorage.getItem(placeholder+"_val") && localStorage.getItem(placeholder+"_val").includes($.trim(o))){
				checked = "checked";
			}
			$("#"+placeholder).append($(' <div class="row"><div class="col-md-9">'+$.trim(o)+" ("+$.trim(counts[i])+')</div><div class="col-md-3"><input type="checkbox" '+checked+' name="'+placeholder+'[]" value="'+$.trim(o)+'" data-toggle="switch" data-on-color="info" data-off-color="info" data-on-text="<i class=\'fa fa-check\'></i>" data-off-text="<i class=\'fa fa-times\'></i>"><span class="toggle"></span></div></div>'));
			filter_count += 1;
		    }
		});
		var filter_height = filter_count*50;
		if (filter_height > 100){
			filter_height = 100;
		}
		$('#'+placeholder+'_card').css("height",filter_height.toString()+"px");
	
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
		    localStorage.setItem(placeholder, field_search);
		    localStorage.setItem(placeholder+"_val",field_val);
		    localStorage.setItem("search_filter", "on");
		    setup_labcas_search(localStorage.getItem('search').replace("&","%26"), "all", 0);
		});
	}
}

function generate_categories(field_id, data){
	$('#'+field_id).empty();
	$("#filter_options").empty();
	$.each(localStorage.getItem("filters").split(","), function(ind, head) {
		if (localStorage.getItem("faceted_categories_selected") == head){
			$('#'+field_id).append("<option value='"+head+"' selected>"+head+" Filters</option>");
		}else{
			$('#'+field_id).append("<option value='"+head+"'>"+head+" Filters</option>");
		}
		var ids = localStorage.getItem(head+"_filters_id").split(",");
		var displays = localStorage.getItem(head+"_filters_display").split(",");
		var divs = localStorage.getItem(head+"_filters_div").split(",");
		$.each(ids, function(i, idhead) {
			generate_filters(idhead,$.trim(divs[i]), data.facet_counts.facet_fields[idhead], $.trim(displays[i]), $.trim(head));
		});
	});
}

//Recursive function to loop through collection, dataset, file hierachy to get filters
function add_labcas_api_facets(querytypes, query, filters, facets, newdata, callback){
        if (querytypes.length < 1){
            callback(newdata);
        }else{
            var querytype = querytypes.pop();
            $.ajax({
                url: localStorage.getItem('environment')+"/data-access-api/"+querytype+"/select?q="+query+""+filters+"&facet=true&facet.limit=-1&facet.field="+facets.join("&facet.field=")+"&wt=json",
                beforeSend: function(xhr) {
                    if(Cookies.get('token') && Cookies.get('token') != "None"){
                        xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
                    }
                },
                type: 'GET',
                dataType: 'json',
                success: function (data) {
                    //join existing data with newdata
                    if (newdata.facet_counts){
                    console.log(localStorage.getItem('environment')+"/data-access-api/"+querytype+"/select?q="+query+""+filters+"&facet=true&facet.limit=-1&facet.field="+facets.join("&facet.field=")+"&wt=json");
                    console.log(newdata.facet_counts);
                    console.log(newdata.facet_counts.facet_fields.length);
                    }
                    if (newdata && newdata.facet_counts && newdata.facet_counts.facet_fields && Object.keys(newdata.facet_counts.facet_fields).length > 0){
                        console.log("pass1");
                        if (data && data.facet_counts && data.facet_counts.facet_fields && Object.keys(data.facet_counts.facet_fields).length > 0){
                            console.log("pass2");
                              $.each(data.facet_counts.facet_fields, function(i, facet_vals) {
                                if (facet_vals && facet_vals.length > 0){
                                    if (newdata.facet_counts.facet_fields[i]){
                                        newdata.facet_counts.facet_fields[i] = facet_vals.concat(newdata.facet_counts.facet_fields[i].filter((item) => facet_vals.indexOf(item) < 0));
                                    }
                                }
                              });
                        }
                    }else{
                        console.log("didn't pass");
                        newdata = data;
                    }
                    console.log(newdata);
                    add_labcas_api_facets(querytypes, query, filters, facets, newdata, callback);
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    console.log(xhr.responseText);
                    console.log(xhr.status);
                    console.log(thrownError);
                    if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                         localStorage.setItem("logout_alert","On");
                         alert("You are currently logged out. Redirecting you to log in.");
                    }
                    redirect_to_login();
                 }
            });
    }
}

function fill_collections_facets(data){
	console.log(data);
	
   	if (localStorage.getItem("search_filter") == "on" || (localStorage.getItem("search") && localStorage.getItem("search") != "*")){
		$('#filter_reset').show();
	}else{
		$('#filter_reset').hide();
	}
	generate_categories("faceted_categories", data);
	$("#faceted_categories").change(function(){
		$.each(localStorage.getItem("filters").split(","), function(ind, head) {
			$("."+head+"_card").hide();
		});
		$(".Core_card").show();
		$(this).find("option:selected").each(function(){
		    var optionValue = $(this).attr("value");
	 	    localStorage.setItem("faceted_categories_selected", optionValue);
		    $("."+optionValue+"_card").show();
		});
		reset_search_filters();
		setup_labcas_search("*", "all", 0);
	});
	$.each(localStorage.getItem("filters").split(","), function(ind, head) {
		$("."+head+"_card").hide();
	});
	$(".Core_card").show();
	$("."+localStorage.getItem("faceted_categories_selected")+"_card").show();
}
function fill_collections_search(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	load_pagination("collections_search",size,cpage);
	$("#search-collection-table tbody").empty();
	//data.response.docs.sort(dataset_compare_sort);
	$.each(data.response.docs, function(key, obj) {
	  var color = "btn-info";
	  if(user_data["FavoriteCollections"].includes(obj.id)){
			color = "btn-success";
	  }
	  $("#search-collection-table tbody").append(
		"<tr>"+
			"<td>"+
			"<a href=\"/labcas-ui/c/index.html?collection_id="+
                    obj.id+"\">"+
                obj.CollectionName+"</a></td>"+
                "<td>"+obj.Organ+"</td>"+
                "<td>"+obj.Discipline+"</td>"+
                "<td>"+obj.Institution+"</td>"+
                "<td>"+obj.LeadPI+"</td>"+
			"<td class=\"td-actions\">"+
				"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\"  onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
					"<i class=\"fa fa-star\"></i>"+
				"</button>"+
			"</td>"+
		"</tr>");	
	});                                                                     
    $("#collection_name").html(size); 
    $('#loading_collection').hide(500);
}


function setup_labcas_search(query, divid, cpage){
    console.log("Searching...");
	if (query != "*"){
	   query = '"'+query+'"';
	}
	var collection_filters = "";
	var collection_facets = [];
	$.each(localStorage.getItem("filters").split(","), function(ind, head) {
		var divs = localStorage.getItem(head+"_filters_div").split(",");
		$.each(divs, function(i, divhead) {
			collection_filters += localStorage.getItem($.trim(divhead));
		});
		collection_facets = collection_facets.concat(localStorage.getItem(head+"_filters_id").split(","));
	});
	var data_filters = "";
    if (divid == "collections_search" || divid == "all"){
		console.log(localStorage.getItem('environment')+"/data-access-api/collections/select?q="+query+""+collection_filters+"&wt=json&indent=true&start="+cpage*10);
		$.ajax({
			url: localStorage.getItem('environment')+"/data-access-api/collections/select?q="+query+""+collection_filters+"&wt=json&indent=true&sort=id%20asc&start="+cpage*10,	
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
			error: function(e){
				if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                                   localStorage.setItem("logout_alert","On");
					 alert("You are currently logged out. Redirecting you to log in.");
				}
				redirect_to_login();
			 }
		});
		//console.log(localStorage.getItem('environment')+"/data-access-api/files/select?q="+query+""+collection_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&wt=json&rows=0&sort=FileName%20asc");
        var querytypes = ["collections","datasets","files"];
        add_labcas_api_facets(querytypes, query, collection_filters, collection_facets, {}, fill_collections_facets);
		/*$.ajax({
			url: localStorage.getItem('environment')+"/data-access-api/files/select?q="+query+""+collection_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&wt=json&rows=0&sort=FileName%20asc",
			beforeSend: function(xhr) {
				if(Cookies.get('token') && Cookies.get('token') != "None"){
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				}
			},
			type: 'GET',
			dataType: 'json',
			success: function (data) {
				console.log("GOT HERE");
				fill_collections_facets(data);
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.log("RIGHTY");
				console.log(xhr.responseText);
				console.log(xhr.status);
				console.log(thrownError);
				if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                                   localStorage.setItem("logout_alert","On");
				 alert("You are currently logged out. Redirecting you to log in.");
				}
				redirect_to_login();
			 }
		});*/
    }
    if (divid == "datasets_search" || divid == "all"){
	wait(1000);
	console.log(localStorage.getItem('environment')+"/data-access-api/datasets/select?q=*:*"+collection_filters+"&facet=true&facet.limit=-1&facet.field="+collection_facets.join("&facet.field=")+"&wt=json&rows=0&sort=DatasetName%20asc");
        $.ajax({
            url: localStorage.getItem('environment')+"/data-access-api/datasets/select?q="+query+""+collection_filters+"&wt=json&sort=DatasetName%20asc&indent=true&start="+cpage*10,
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
            error: function(e){
		if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
			   localStorage.setItem("logout_alert","On");
			 alert("You are currently logged out. Redirecting you to log in.");
		}
		redirect_to_login();
             }
        });
    }
    if (divid == "files_search" || divid == "all"){
		console.log("Files search");
		console.log(localStorage.getItem('environment')+"/data-access-api/files/select?q="+query+""+collection_filters+"&wt=json&indent=true&sort=FileName%20asc&start="+cpage*10);
		wait(1000);
		$.ajax({
			url: localStorage.getItem('environment')+"/data-access-api/files/select?q="+query+""+collection_filters+"&wt=json&indent=true&sort=FileName%20asc&start="+cpage*10,
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
				setup_labcas_analytics(query, collection_filters);
			},
			error: function(e){
				if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                                   localStorage.setItem("logout_alert","On");
				    alert("You are currently logged out. Redirecting you to log in.");
				}
			redirect_to_login();
			 
			 }
		});

	}
}
/* End Search Section */


/*Starred Section*/
function fill_datasets_starred(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	$("#starred-dataset-table tbody").empty();
	$.each(data.response.docs, function(key, obj) {
	  if(user_data["FavoriteDatasets"].includes(obj.id)){
		  var color = "btn-success";
	  
	
		  $("#starred-dataset-table tbody").append(
			"<tr>"+
				"<td><!--<div class=\"form-check\">"+
					"<label class=\"form-check-label\">"+
						"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
						"<span class=\"form-check-sign\"></span>"+
					"</label>"+
				"</div>--></td><td>"+
				"<a href=\"/labcas-ui/d/index.html?dataset_id="+
						obj.id+"\">"+
					obj.DatasetName+"</a></td>"+
					"<td><a href=\"/labcas-ui/c/index.html?collection_id="+
						obj.CollectionId+"\">"+
							obj.CollectionName+"</a></td>"+
				"<td class=\"td-actions\">"+
					"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteDatasets', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
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
	$("#starred-file-table tbody").empty();
	$.each(data.response.docs, function(key, obj) {
		  var color = "btn-success";
	  
		  var filetype = obj.FileType ? obj.FileType.join(",") : "";
		  var description = obj.Description? obj.Description.join(",") : "";
		var thumb = "";
		  if ('ThumbnailRelativePath' in obj){
			thumb = "<img width='50' height='50' src='"+localStorage.getItem('environment')+"/labcas-ui/assets/"+obj.ThumbnailRelativePath+"'/>";
		  }
		var filesize = "";
		  if (obj.FileSize){
			filesize = humanFileSize(obj.FileSize, true);
		  }     
		  $("#starred-file-table tbody").append(
			"<tr>"+
				"<td><!--<div class=\"form-check\">"+
					"<label class=\"form-check-label\">"+
						"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
						"<span class=\"form-check-sign\"></span>"+
					"</label>"+
				"</div>--></td>"+
				"<td class='text-left'>"+
					"<a href=\"/labcas-ui/f/index.html?file_id="+
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
						filesize+
				"</td>"+
				"<td class=\"td-actions\">"+
					"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\" onclick=\"save_favorite('"+obj.id+"', 'FavoriteFiles', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
						"<i class=\"fa fa-star\"></i>"+
					"</button>"+
				"</td>"+
			"</tr>");	
	});              
	$("#files_len").html(size); 
}

function fill_collections_starred(data){
	var size = data.response.numFound;
	var cpage = data.response.start;
	$("#starred-collection-table tbody").empty();
	
	$.each(data.response.docs, function(key, obj) {
	  if(user_data["FavoriteCollections"].includes(obj.id)){
		  var color = "btn-success";
	  
		  $("#starred-collection-table tbody").append(
			"<tr>"+
				"<td><!--<div class=\"form-check\">"+
					"<label class=\"form-check-label\">"+
						"<input class=\"form-check-input\" type=\"checkbox\" value=''>"+
						"<span class=\"form-check-sign\"></span>"+
					"</label>"+
				"</div>--></td><td>"+
				"<a href=\"/labcas-ui/c/index.html?collection_id="+
						obj.id+"\">"+
					obj.CollectionName+"</a></td>"+
					"<td>"+obj.Organ+"</td>"+
					"<td>"+obj.Discipline+"</td>"+
					"<td>"+obj.Institution+"</td>"+
					"<td>"+obj.LeadPI+"</td>"+
				"<td class=\"td-actions\">"+
					"<button type=\"button\" rel=\"tooltip\" title=\"Favorite\"  onclick=\"save_favorite('"+obj.id+"', 'FavoriteCollections', this)\" class=\"btn "+color+" btn-simple btn-link\">"+
						"<i class=\"fa fa-star\"></i>"+
					"</button>"+
				"</td>"+
			"</tr>");	
		}
	});                                                                     
    $("#collections_len").html(size); 
    $('#loading').hide(500);
    
}

function setup_labcas_starred(query, divid, cpage){
	var collection_starred_search = "";
	if (user_data["FavoriteCollections"].length > 0){
		collection_starred_search = "&fq=(id:"+user_data["FavoriteCollections"].map(x => encodeURI(escapeRegExp(String(x)))).join(" OR id:")+")";
	}
	var dataset_starred_search = "";
	if (user_data["FavoriteDatasets"].length > 0){
		dataset_starred_search = "&fq=(id:"+user_data["FavoriteDatasets"].map(x => encodeURI(escapeRegExp(String(x)))).join(" OR id:")+")";
	}
	var file_starred_search = "";
	if (user_data["FavoriteFiles"].length > 0){
		var tmp_files_search = user_data["FavoriteFiles"].map(x => encodeURI(escapeRegExp(String(x)))).join(" OR id:").replace(/ *\([^)]*\) */g, "*");
		file_starred_search = "&fq=(id:"+tmp_files_search+")";
	}
    //console.log("Loading data...");
    if (divid == "collections_starred" || divid == "all"){
        console.log(localStorage.getItem('environment')+"/data-access-api/collections/select?q=*"+collection_starred_search+"&wt=json&indent=true&start="+cpage*10);
		$.ajax({
			url: localStorage.getItem('environment')+"/data-access-api/collections/select?q=*"+collection_starred_search+"&wt=json&indent=true&sort=id%20asc&start="+cpage*10,	
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
			error: function(e){
				if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
				   localStorage.setItem("logout_alert","On");
				   alert("You are currently logged out. Redirecting you to log in.");
				}
				redirect_to_login();
			 }
		});
    }
    if (divid == "datasets_starred" || divid == "all"){
        $.ajax({
            url: localStorage.getItem('environment')+"/data-access-api/datasets/select?q=*"+dataset_starred_search+"&wt=json&indent=true&start="+cpage*10,
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
            error: function(e){
		if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                   localStorage.setItem("logout_alert","On");
                   alert("You are currently logged out. Redirecting you to log in.");
		}
             }
        });
    }
    
    if (divid == "files_starred" || divid == "all"){
		console.log(localStorage.getItem('environment')+"/data-access-api/files/select?q=*"+file_starred_search+"&wt=json&indent=true&sort=FileName%20asc&start="+cpage*10);
		
		$.ajax({
			url: localStorage.getItem('environment')+"/data-access-api/files/select?q=*"+file_starred_search+"&wt=json&sort=FileName%20asc&indent=true&start="+cpage*10,
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
				fill_files_starred(data);
			},
			error: function(e){
				if (!(localStorage.getItem("logout_alert") && localStorage.getItem("logout_alert") == "On")){
                                   localStorage.setItem("logout_alert","On");
				   alert("You are currently logged out. Redirecting you to log in.");
				}
			 
			 }
		});
	}
	$("#favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
}

/* Starred Section End */
