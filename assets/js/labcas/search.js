function search(){
    var search_text = $('#search_text').val();
    if (search_text && search_text != ""){
	    localStorage.setItem("search", search_text.replace("&","%26"));
    }else{
	    var search_text_main = $('#search_text_main').val();
	    if (search_text_main && search_text_main != ""){
		localStorage.setItem("search", search_text_main.replace("&","%26"));
		}
	search_text = search_text_main;
    }

    console.log(localStorage.getItem("search"));
    console.log("Set search");
    window.location.href = "/labcas-ui/s/index.html?search="+search_text.replace("&","%26");
}

function fill_datasets_search(data){
    var size = data.response.numFound;
    var cpage = data.response.start;
    load_pagination("datasets_search",size,cpage);
    $("#search-dataset-table tbody").empty();

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
      var fileloc = obj.RealFileLocation ? obj.RealFileLocation : "";

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

function fill_collections_search(data){
    var size = data.response.numFound;
    var cpage = data.response.start;
    load_pagination("collections_search",size,cpage);
    $("#search-collection-table tbody").empty();
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
        var querytypes = ["collections","datasets","files"];
        add_labcas_api_facets(querytypes, query, collection_filters, collection_facets, {}, fill_collections_facets);
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

