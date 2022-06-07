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
function fill_collection_details_data(data){
    console.log("Fill collection details");
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

function fill_collections_public_data(data){
    $.each(data.response.docs, function(index, obj) {
        if ((!obj.OwnerPrincipal) || (obj.OwnerPrincipal && obj.OwnerPrincipal.includes("All Users"))){
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
        $("#collection_datasets_len").html(data.response.numFound);
        $("#collection_favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
    $('#loading_dataset').hide(500);
    $('#loading_metadata').hide(500);

}
function setup_labcas_data(datatype, query, dataset_query){
    console.log(localStorage.getItem('environment')+"/data-access-api/collections/select?q="+query+"&wt=json&indent=true&rows=10000&sort=id%20asc");
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
                console.log("publiccollection");
                console.log(data);

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

