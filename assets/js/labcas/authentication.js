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
    if (data.response.docs[0].id)
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
		}else if ('ThumbnailPath' in data.response.docs[0] && data.response.docs[0].ThumbnailPath.startsWith("/labcas-data/labcas-backend/thumbnails")){
            thumb = "<img width='50' height='50' src='"+localStorage.getItem('environment')+"/labcas-ui/assets/img/"+data.response.docs[0].ThumbnailPath.replace(/\/labcas-data\/labcas-backend\//g, '')+"'/>";
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
		if (filename.endsWith(".dcm") || filename.endsWith(".dicom") || filename.endsWith(".DCM")){
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

