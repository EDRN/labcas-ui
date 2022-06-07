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

