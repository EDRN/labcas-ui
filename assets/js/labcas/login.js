Cookies.set("token", "None");
$(document).ready(function(){
$.getJSON( '/labcas-ui/assets/conf/environment.cfg?2', function(json) {
	$.each( json, function( key, val ) {
		console.log(key);
		localStorage.setItem(key, val);
	});
}, 'text').done(function(d) {
                console.log("Config done");
            }).fail(function(d, textStatus, error) {
                console.error("Config failed, status: " + textStatus + ", error: "+error);
            }).always(function(d) {
                console.log("Config complete");
            });
	$('#loginerror').html(localStorage.getItem("login_msg"));
});
$('#loginform').submit(function (e) {
	e.preventDefault();
	Cookies.set("user", $('#username').val());
	Cookies.set("userletters", $('#username').val().substr(0, 2).toUpperCase());
        $.ajax({
            url: localStorage.getItem('environment')+"/data-access-api/auth",
                beforeSend: function(xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + btoa($('#username').val() + ":" + $('#password').val()));
                },
                type: 'GET',
                success: function (data) {
			Cookies.set("logout_alert","Off");
			Cookies.set("token", data);
			Cookies.set("JasonWebToken", data);
			//Get user data, then redirect
			$.ajax({
				url: localStorage.getItem('environment')+"/data-access-api/userdata/read?id="+Cookies.get('user'),
				beforeSend: function(xhr) { 
					xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token')); 
				},
				type: 'GET',
				dataType: 'json',
				success: function (data) {
					user_data = {"FavoriteCollections":[],"FavoriteDatasets":[],"FavoriteFiles":[]};
					first_time_user = false;
					if (data['response'] && data['response']['docs'] && data['response']['docs'][0]){
						user_data = data['response']['docs'][0];
					}
					if (!user_data["FavoriteCollections"]){
						user_data["FavoriteCollections"] = [];
						//first time user
						first_time_user = true;	
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

					writeUserData(JSON.stringify(user_data))
					localStorage.setItem("first_time_user",  first_time_user);
					if (Cookies.get("login_redirect")){
						window.location.replace(Cookies.get("login_redirect"));
					}else{
						window.location.replace("/labcas-ui/m/index.html");
					}
				},
				error: function(){
					 //alert("Login expired, please login...");
					 //window.location.replace("/labcas-ui/application/pages/login.html");
				 }
			});
                },
                error: function(){
                    Cookies.set("token", "None");
                    $('#alertHTML').html(localStorage.getItem("error_msg"));
                    $('#errorModal').modal('show');
                }
        }); 
});
