collections = [];
collection_disc = {};
collection_labels = [];
collection_dataset_count = [];
var collection_protocolid_map = {};
function get_acronym(str){
	var matches = str.match(/\b(\w)/g);
	return matches.join('');
}
function init_labcas_sunburst_distribution(div_field, filter, collections, collection_dataset_count, collection_labels, xlabel, ylabel, ftype){
	
	var data = [{
	  colorscale: 'Blackbody',
	  x: collections,
	  y: collection_dataset_count,
	  marker: {color:  ['rgb(165,0,38)','rgb(69,117,180)', 'rgb(116,173,209)','rgb(253,174,97)','rgb(254,224,144)','rgb(244,109,67)','rgb(224,243,248)','rgb(171,217,233)','rgb(215,48,39)','rgb(49,54,149)']},
	  //marker: {color: data.color, size: data.size},
	  mode: "markers",
	  text: collection_labels,
	  type: 'bar',
	  colorscale: 'Jet'
	}];

	var layout = {
        yaxis: {title: ylabel, type: 'log'},
	  xaxis: {title: xlabel, showline: true, tickangle: 30},
	  mode: 'text',
	  margin: {t: 0, b: 75},
	  height: 200,
	  showlegend: false
	};


	Plotly.newPlot(div_field, data, layout,{displayModeBar: false, responsize: true});
	document.getElementById(div_field).on('plotly_click', function(data){
                var pts = '';
                    for(var i=0; i < data.points.length; i++){
                        pts = 'label(country) = '+ data.points[0].text + '\nvalue(%) = ' + data.points[0].value;
                        label = data.points[0].text;
                        field_search = "&fq=("+encodeURI(escapeRegExp(ftype)).replace(/:/g,'%3A')+":"+encodeURI(escapeRegExp(String(label)))+")";
                        reset_search_filters();
                        localStorage.setItem(filter, field_search);
                        filter_list = [];
                        filter_list.push(String(label));
                        localStorage.setItem(filter+"_val",filter_list);
                        localStorage.setItem("search_filter", "on");
                        localStorage.setItem('search','');
                        console.log(filter);
                        console.log(filter+"_val");
                        window.location.replace("/labcas-ui/s/index.html?search=*");
                    }
	    });
}


/*function init_labcas_sunburst_distribution(div_field, collections, collection_dataset_count, collection_labels, xlabel, ylabel){
	
	var data = [{
	  colorscale: 'Blackbody',
	  x: collections,
	  y: collection_dataset_count,
	  marker: {color:  ['rgb(165,0,38)','rgb(69,117,180)', 'rgb(116,173,209)','rgb(253,174,97)','rgb(254,224,144)','rgb(244,109,67)','rgb(224,243,248)','rgb(171,217,233)','rgb(215,48,39)','rgb(49,54,149)']},
	  mode: "markers",
	  text: collection_labels,
	  type: 'bar',
	  colorscale: 'Jet'
	}];

	var layout = {
	  yaxis: {title: ylabel},
	  xaxis: {title: xlabel, showline: true, tickangle: 30},
	  mode: 'text',
	  margin: {t: 0, b: 110},
	  height: 230,
	  showlegend: false
	};


	Plotly.newPlot(div_field, data, layout,{displayModeBar: false, responsize: true});
}*/

function init_labcas_data_distribution_search(div, filter, second_graph_organ, ftype){ //acronym, name, count, date
	var data = [{
	  values: second_graph_organ[1],
	  text: second_graph_organ[0],
	 textposition: 'inside',
	  type: 'pie'
	}];

	var layout = {
	  margin: {t: 0, b: 0},
	  height: 200,
	  showlegend: false
	};
	myplot = Plotly.newPlot(div, data, layout,{displayModeBar: false, responsize: true});
	document.getElementById(div).on('plotly_click', function(data){
		var pts = '';
		    for(var i=0; i < data.points.length; i++){
			pts = 'label(country) = '+ data.points[0].text + '\nvalue(%) = ' + data.points[0].value;
			label = data.points[0].text;
			field_search = "&fq=("+encodeURI(escapeRegExp(ftype)).replace(/:/g,'%3A')+":"+encodeURI(escapeRegExp(String(label)))+")";
			reset_search_filters();
			localStorage.setItem(filter, field_search);
			filter_list = [];
			filter_list.push(String(label));
			localStorage.setItem(filter+"_val",filter_list);
			localStorage.setItem("search_filter", "on");
			localStorage.setItem('search','');
			console.log(filter);
			console.log(filter+"_val");
			window.location.replace("/labcas-ui/s/index.html?search=*");
		    }
			//console.log(data);
		    //alert('Closest point clicked:\n\n'+pts+" OK "+div);
	});
}


function init_labcas_data_distribution(div, second_graph_organ, ftype){ //acronym, name, count, date
	var data = [{
	  values: second_graph_organ[1],
	  text: second_graph_organ[0],
	 textposition: 'inside',
	  type: 'pie'
	}];

	var layout = {
	  margin: {t: 0, b: 0},
	  height: 200,
	  showlegend: false
	};
	myplot = Plotly.newPlot(div, data, layout,{displayModeBar: false, responsize: true});
	document.getElementById(div).on('plotly_click', function(data){
		var pts = '';
		    for(var i=0; i < data.points.length; i++){
			pts = 'label(country) = '+ data.points[0].text + '\nvalue(%) = ' + data.points[0].value;
			label = data.points[0].text;
			field_search = "&fq=("+encodeURI(escapeRegExp(ftype)).replace(/:/g,'%3A')+":"+encodeURI(escapeRegExp(String(label)))+")";
			reset_search_filters();
			localStorage.setItem(div, field_search);
			filter_list = [];
			filter_list.push(String(label));
			localStorage.setItem(div+"_val",filter_list);
			localStorage.setItem("search_filter", "on");
			localStorage.setItem('search','');
			window.location.replace("/labcas-ui/s/index.html");
		    }
	});
}
function init_labcas_data_boxplot_search(div, filter, second_graph,xlabel, ylabel, ftype){
	
	
	var data = [{
	  colorscale: 'Blackbody',
	  x: second_graph[0],
	  y: second_graph[1],
	  marker: {color:  ['rgb(165,0,38)','rgb(69,117,180)', 'rgb(116,173,209)','rgb(253,174,97)','rgb(254,224,144)','rgb(244,109,67)','rgb(224,243,248)','rgb(171,217,233)','rgb(215,48,39)','rgb(49,54,149)']},
	  //marker: {color: data.color, size: data.size},
	  mode: "markers",
	  text: second_graph[0],
	  type: 'bar',
	  colorscale: 'Jet'
	}];

	var layout = {
	  yaxis: {title: ylabel},
	  xaxis: {title: xlabel, showline: true, tickangle: 30},
	  margin: {t: 0, b: 90},
	  height: 200,
	  showlegend: false
	};


	Plotly.newPlot(div, data, layout,{displayModeBar: false, responsize: true});
	document.getElementById(div).on('plotly_click', function(data){
                var pts = '';
                    for(var i=0; i < data.points.length; i++){
                        pts = 'label(country) = '+ data.points[0].text + '\nvalue(%) = ' + data.points[0].value;
			console.log(pts);
                        label = data.points[0].text;
			console.log(label);
                        field_search = "&fq=("+encodeURI(escapeRegExp(ftype)).replace(/:/g,'%3A')+":"+encodeURI(escapeRegExp(String(label)))+")";
                        reset_search_filters();
                        localStorage.setItem(filter, field_search);
                        filter_list = [];
                        filter_list.push(String(label));
                        localStorage.setItem(filter+"_val",filter_list);
                        localStorage.setItem("search_filter", "on");
                        localStorage.setItem('search','');
                        console.log(filter);
                        console.log(filter+"_val");
                        window.location.replace("/labcas-ui/s/index.html?search=*");
                    }
	    });
}


function init_labcas_data_boxplot(div, second_graph,xlabel, ylabel){
	
	
	var data = [{
	  colorscale: 'Blackbody',
	  x: second_graph[0],
	  y: second_graph[1],
	  marker: {color:  ['rgb(165,0,38)','rgb(69,117,180)', 'rgb(116,173,209)','rgb(253,174,97)','rgb(254,224,144)','rgb(244,109,67)','rgb(224,243,248)','rgb(171,217,233)','rgb(215,48,39)','rgb(49,54,149)']},
	  //marker: {color: data.color, size: data.size},
	  mode: "markers",
	  text: second_graph[0],
	  type: 'bar',
	  colorscale: 'Jet'
	}];

	var layout = {
	  yaxis: {title: ylabel},
	  xaxis: {title: xlabel, showline: true, tickangle: 30},
	  margin: {t: 0, b: 110},
	  height: 230,
	  showlegend: false
	};


	Plotly.newPlot(div, data, layout,{displayModeBar: false, responsize: true});
	
}

function fill_files_analytics(data){
	var size = data.response.numFound;
	var filetype_count = [];
	var filetype_type = [];
	var filetypes = [];
	var filetypecounts = [];
	if(data.facet_counts.facet_fields["FileType"]){
                $.each(data.facet_counts.facet_fields["FileType"], function(key, obj) {
                    if (Number.isInteger(obj)){
                        filetype_count.push(obj);
                    }else{
                        filetype_type.push(obj);
                    }
                });
        }
	var score = {};
        for( var i=0,n=filetype_count.length; i<n; i++){
                var datum = filetype_count[i];
                if (!score[datum]) {
                        score[datum] = [];
                }
                score[datum].push(filetype_type[i]);
        }
        var count = 0;
        for( var key in keys=Object.keys(score).sort(function(a, b){return b-a}) ){
	  if (isNaN(key)){
		continue;
	  }
          var prop = keys[key];
          if (count > 9){
                break;
          }
          for (var i=0; i<score[prop].length;i++){
                  filetypes.push(score[prop][i]);
                  filetypecounts.push(prop);
	  }
          count += 1;

        }
        init_labcas_sunburst_distribution("labcas_filetype_distribution", "filetype_filters", filetypes, filetypecounts, filetypes, 'File Type', "File Count", "FileType");

	var second_graph_leadpi = [[],[]];
	$.each(data.facet_counts.facet_fields["LeadPI"], function(key, val) { 
	    if (Number.isInteger(val)){
                second_graph_leadpi[1].push(val);
            }else{
                second_graph_leadpi[0].push(val);
            }
	});
//init_labcas_data_boxplot_search("labcas_boxplot_distribution","pi_filters", second_graph_leadpi, "Lead PI", "File Count", "LeadPI");

        $("#files_len").html(size);
}

function fill_collections_analytics(data){
	var size = data.response.numFound;
	$("#collections_len").html(size);
	
	var second_graph_institution_dict = {};
	var second_graph_organ_dict = {};
	var second_graph_discipline_dict = {};
	var second_graph_collabgroup_dict = {};
	var second_graph_discipline_dict = {};
	var second_graph_leadpi_dict = {};
	var second_graph_species_dict = {};
	var second_graph_pubmed_dict = {};
	
	var second_graph_institution = [[],[]];
	var second_graph_organ = [[],[]];
	var second_graph_collabgroup = [[],[]];
	var second_graph_discipline = [[],[]];
	var second_graph_discipline = [[],[]];
	var second_graph_leadpi = [[],[]];
	var second_graph_pubmed = [[],[]];
	console.log(data);
	
	$.each(data.response.docs, function(key, obj) {
		collection_disc[obj.CollectionName] = [obj.Institution ? obj.Institution : [], obj.Organ ? obj.Organ : [], obj.CollaborativeGroup ? obj.CollaborativeGroup : [], obj.Discipline ? obj.Discipline : [], obj.LeadPI ? obj.LeadPI : [], obj.Species ? obj.Species : [], obj.PubMedID ? obj.PubMedID : []]; //institution, organ, collabgroup, discipline, leadpi, species, pubmed
		if (obj.ProtocolId){
			$.each(obj.ProtocolId, function(idx, y) {
                                y = y.trim();
				if (collection_protocolid_map[y]){
					collection_protocolid_map[y].push(obj.CollectionName);
				}else{
					collection_protocolid_map[y] = [obj.CollectionName];
				}
                        });
		}
		if (obj.ProtocolID){
			$.each(obj.ProtocolID, function(idx, y) {
                                y = y.trim();
                                if (collection_protocolid_map[y]){
                                        collection_protocolid_map[y].push(obj.CollectionName);
                                }else{
                                        collection_protocolid_map[y] = [obj.CollectionName];
                                }
                        });
		}
		if (obj.Institution){
			$.each(obj.Institution, function(idx, y) { 
				y = y.trim();
				second_graph_institution_dict[y] = (second_graph_institution_dict[y] || 0) + 1;
			});
		}
		if (obj.Organ){
			$.each(obj.Organ, function(idx, y) { 
				y = y.trim();
				second_graph_organ_dict[y] = (second_graph_organ_dict[y] || 0) + 1;
			});
		}
		if (obj.Discipline){
			$.each(obj.Discipline, function(idx, y) { 
				y = y.trim();
				
				if (y == ""){
					y = "None";
				}
				second_graph_discipline_dict[y] = (second_graph_discipline_dict[y] || 0) + 1;
			});
		}
		if (obj.DataCategory){
			$.each(obj.DataCategory, function(idx, y) { 
				y = y.trim();
				second_graph_collabgroup_dict[y] = (second_graph_collabgroup_dict[y] || 0) + 1;
			});
		}
		if (obj.Species){
			$.each(obj.Species, function(idx, y) { 
				y = y.trim();
				second_graph_species_dict[y] = (second_graph_species_dict[y] || 0) + 1;
			});
		}
		if (obj.PubMedID){
			$.each(obj.PubMedID, function(idx, y) { 
				y = y.trim();
				second_graph_pubmed_dict[y] = (second_graph_pubmed_dict[y] || 0) + 1;
			});
		}
	});
	$.each(second_graph_organ_dict, function(key, val) { 
		second_graph_organ[0].push(key);
		second_graph_organ[1].push(val);
	});
	$.each(second_graph_collabgroup_dict, function(key, val) { 
		second_graph_collabgroup[0].push(key);
		second_graph_collabgroup[1].push(val);
	});
	$.each(second_graph_discipline_dict, function(key, val) { 
		second_graph_discipline[0].push(key);
		second_graph_discipline[1].push(val);
	});
	
	init_labcas_data_distribution_search("organ_distribution", "organ_filters", second_graph_organ, "Organ");
	//init_labcas_data_distribution("organ_filters", second_graph_organ, "Organ");
	init_labcas_data_distribution("datacategory_filters", second_graph_collabgroup, "DataCategory");
	init_labcas_data_distribution("disc_filters", second_graph_discipline, "Discipline");
	
}
function fill_datasets_analytics(data){
	var size = data.response.numFound;
	$("#datasets_len").html(size);
	/*
	var cl = [];
	var cdc = [];
	var cla = [];
	
	if(data.facet_counts.facet_fields["ProtocolID"]){
		$.each(data.facet_counts.facet_fields["ProtocolID"], function(key, obj) {
		    if (Number.isInteger(obj)){
			cdc.push(obj);
		    }else{
			cl.push(obj);
			cla.push(obj);
		    }
		});
	}
	if(data.facet_counts.facet_fields["ProtocolId"]){
		$.each(data.facet_counts.facet_fields["ProtocolId"], function(key, obj) {
		    if (Number.isInteger(obj)){
			cdc.push(obj);
		    }else{
			cl.push(obj);
			cla.push(obj);
		    }
		});
	}
	
	

	var score = {};
	for( var i=0,n=cdc.length; i<n; i++){
		var datum = cdc[i];
		if (!score[datum]) {
			score[datum] = [];
		}
		score[datum].push(cl[i]);
	}
	var count = 0;
	for( var key in keys=Object.keys(score).sort(function(a, b){return b-a}) ){
	  var prop = keys[key];
	  if (count > 9){
	  	break;
	  }
	  for (var i=0; i<score[prop].length;i++){
		  if (!collection_protocolid_map[score[prop][i]]){
			collection_protocolid_map[score[prop][i]] = ["Protocol "+score[prop][i]];
		  }
		  collections.push("Protocol "+score[prop][i]);
		  collection_dataset_count.push(prop);
		  collection_labels.push(collection_protocolid_map[score[prop][i]].join(",").trim());
	  }
	  count += 1;
	  
	}
	init_labcas_sunburst_distribution("labcas_sunburst_distribution", collections, collection_dataset_count, collection_labels, 'Protocol ID', 'Dataset Count');*/
}
//function fill_files_analytics(data){
//	var size = data.response.numFound;
	/*var filetype_count = [];
	var filetype_type = [];
	var filetypes = [];
	var filetypecounts = [];
	if(data.facet_counts.facet_fields["FileType"]){
                $.each(data.facet_counts.facet_fields["FileType"], function(key, obj) {
                    if (Number.isInteger(obj)){
                        filetype_count.push(obj);
                    }else{
                        filetype_type.push(obj);
                    }
                });
        }
	var score = {};
        for( var i=0,n=filetype_count.length; i<n; i++){
                var datum = filetype_count[i];
                if (!score[datum]) {
                        score[datum] = [];
                }
                score[datum].push(filetype_type[i]);
        }
        var count = 0;
        for( var key in keys=Object.keys(score).sort(function(a, b){return b-a}) ){
          var prop = keys[key];
          if (count > 9){
                break;
          }
          for (var i=0; i<score[prop].length;i++){
                  filetypes.push(score[prop][i]);
                  filetypecounts.push(prop);
	  }
          count += 1;

        }
        init_labcas_sunburst_distribution("labcas_filetype_distribution",filetypes, filetypecounts, filetypes, 'File Type', "File Count");

	var second_graph_leadpi = [[],[]];
	$.each(data.facet_counts.facet_fields["LeadPI"], function(key, val) { 
	    if (Number.isInteger(val)){
                second_graph_leadpi[1].push(val);
            }else{
                second_graph_leadpi[0].push(val);
            }
	});

	init_labcas_data_boxplot("labcas_boxplot_distribution",second_graph_leadpi, "Lead PI", "File Count");*/
	
//	$("#files_len").html(size);
//}
function fill_favorites_analytics(){
	$("#favorites_len").html(user_data['FavoriteFiles'].length+user_data['FavoriteDatasets'].length+user_data['FavoriteCollections'].length);
}
function setup_labcas_analytics(){
        console.log("Analyzing...");
        //collection data
	var collection_url = localStorage.getItem('environment')+"/data-access-api/collections/select?q=*&wt=json&indent=true&rows=2147483647";
	console.log(collection_url);
    
	$.ajax({
		url: collection_url,	
		beforeSend: function(xhr) {
			if(Cookies.get('token') && Cookies.get('token') != "None"){
				xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token'));
			}
		},
		type: 'GET',
		dataType: 'json',
		success: function (data) {
			fill_collections_analytics(data); 
	
			//dataset data
			var dataset_url = localStorage.getItem('environment')+"/data-access-api/datasets/select?q=*&facet=true&facet.limit=-1&facet.field=CollectionName&facet.field=ProtocolID&facet.field=ProtocolId&facet.field=LeadPI&wt=json&rows=0";
			console.log(dataset_url);
			$.ajax({
				url: dataset_url,
				beforeSend: function(xhr) {
					if(Cookies.get('token') && Cookies.get('token') != "None"){
						xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token'));
					}

				},
				type: 'GET',
				dataType: 'json',
				processData: false,
				success: function (data) {
					fill_datasets_analytics(data);
				},
				error: function(){
					 alert("Login expired, please login...");
					 window.location.replace("/labcas-ui/index.html");
				 }
			});
		},
		error: function(){
			 alert("Login expired, please login...");
			 window.location.replace("/labcas-ui/index.html");
		 }
	});

			console.log("Hur");
	$.ajax({
		url: localStorage.getItem('environment')+"/data-access-api/files/select?q=*&facet=true&facet.limit=-1&facet.field=FileType&facet.field=LeadPI&wt=json&rows=0",
		beforeSend: function(xhr, settings) { 
			if(Cookies.get('token') && Cookies.get('token') != "None"){
				xhr.setRequestHeader("Authorization", "Bearer " + Cookies.get('token'));
			}
		},
		type: 'GET',
		dataType: 'json',
		success: function (data) {
			fill_files_analytics(data);
		},
		error: function(){
			 alert("Login expired, please login...");
			 window.location.replace("/labcas-ui/index.html");
		 
		 }
	});
	fill_favorites_analytics();
}
