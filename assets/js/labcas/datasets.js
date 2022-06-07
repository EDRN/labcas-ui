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
        var fileloc = value.RealFileLocation ? value.RealFileLocation : "";
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
        $( "#dataset_stat_template" ).load("/labcas-ui/templates.html?version=3.0.0 #dataset_name_template");
    }
        $("#children-datasets-section").append(dataset_html);
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

