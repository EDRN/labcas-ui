// namespaces
var dwvjq = dwvjq || {};

/**
 * Application launcher.
 */

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


// start app function
function startApp() {
  // translate page
  dwv.i18nPage();

  // show dwv version
  dwvjq.gui.appendVersionHtml(dwv.getVersion());

  // initialise the application
  var loaderList = ['File', 'Url', 'GoogleDrive', 'Dropbox'];

  var filterList = ['Threshold', 'Sharpen', 'Sobel'];

  var shapeList = [
    'Arrow',
    'Ruler',
    'Protractor',
    'Rectangle',
    'Roi',
    'Ellipse',
    'FreeHand'
  ];

  var toolList = {
    Scroll: {},
    WindowLevel: {},
    ZoomAndPan: {},
    Draw: {
      options: shapeList,
      type: 'factory',
      events: ['draw-create', 'draw-change', 'draw-move', 'draw-delete']
    },
    Livewire: {
      events: ['draw-create', 'draw-change', 'draw-move', 'draw-delete']
    },
    Filter: {
      options: filterList,
      type: 'instance',
      events: ['filter-run', 'filter-undo']
    },
    Floodfill: {
      events: ['draw-create', 'draw-change', 'draw-move', 'draw-delete']
    }
  };

  // initialise the application
  var options = {
    containerDivId: 'dwv',
    gui: ['help', 'undo'],
    loaders: loaderList,
    tools: toolList
    //"defaultCharacterSet": "chinese"
  };
  if (dwv.env.hasInputDirectory()) {
    options.loaders.splice(1, 0, 'Folder');
  }

  // main application
  var myapp = new dwv.App();
  myapp.init(options);

  // show help
  var isMobile = true;
  dwvjq.gui.appendHelpHtml(
    myapp.getToolboxController().getToolList(),
    isMobile,
    myapp,
    'resources/help'
  );

  // setup the undo gui
  var undoGui = new dwvjq.gui.Undo(myapp);
  undoGui.setup();

  // setup the dropbox loader
  var dropBoxLoader = new dwvjq.gui.DropboxLoader(myapp);
  dropBoxLoader.init();

  // setup the loadbox gui
  var loadboxGui = new dwvjq.gui.Loadbox(myapp);
  loadboxGui.setup(loaderList);

  // info layer
  var infoController = new dwvjq.gui.info.Controller(myapp, 'dwv');
  infoController.init();

  // setup the tool gui
  var toolboxGui = new dwvjq.gui.ToolboxContainer(myapp, infoController);
  toolboxGui.setup(toolList);

  // setup the meta data gui
  var metaDataGui = new dwvjq.gui.MetaData(myapp);

  // setup the draw list gui
  var drawListGui = new dwvjq.gui.DrawList(myapp);
  drawListGui.init();

  // loading time listener
  var loadTimerListener = function (event) {
    if (event.type === 'load-start') {
      console.time('load-data');
    } else if (event.type === 'load-end') {
      console.timeEnd('load-data');
    }
  };
  // abort shortcut listener
  var abortOnCrtlX = function (event) {
    if (event.ctrlKey && event.keyCode === 88) {
      // crtl-x
      console.log('Abort load received from user (crtl-x).');
      myapp.abortLoad();
    }
  };

  // handle load events
  var nReceivedLoadItem = null;
  var nReceivedError = null;
  var nReceivedAbort = null;
  myapp.addEventListener('load-start', function (event) {
    loadTimerListener(event);
    // reset counts
    nReceivedLoadItem = 0;
    nReceivedError = 0;
    nReceivedAbort = 0;
    // reset progress bar
    dwvjq.gui.displayProgress(0);
    // allow to cancel via crtl-x
    window.addEventListener('keydown', abortOnCrtlX);
  });
  myapp.addEventListener('load-progress', function (event) {
    var percent = Math.ceil((event.loaded / event.total) * 100);
    dwvjq.gui.displayProgress(percent);
  });
  myapp.addEventListener('load-item', function (event) {
    ++nReceivedLoadItem;
    // add new meta data to the info controller
    if (event.loadtype === 'image') {
      infoController.onLoadItem(event);
    }
    // hide drop box (for url load)
    dropBoxLoader.hideDropboxElement();
    // initialise and display the toolbox
    toolboxGui.initialise();
    toolboxGui.display(true);
  });
  myapp.addEventListener('load', function (event) {
    // update info controller
    if (event.loadtype === 'image') {
      infoController.onLoadEnd();
    }
    // initialise undo gui
    undoGui.setup();
    // update meta data table
    metaDataGui.update(myapp.getMetaData());
  });
  myapp.addEventListener('error', function (event) {
    alert(event.error);
    console.error('load error', event);
    console.error(event.error);
    ++nReceivedError;
  });
  myapp.addEventListener('abort', function (/*event*/) {
    ++nReceivedAbort;
  });
  myapp.addEventListener('load-end', function (event) {
    loadTimerListener(event);
    // show the drop box if no item were received
    if (nReceivedLoadItem === 0) {
      dropBoxLoader.showDropboxElement();
    }
    // show alert for errors
    if (nReceivedError !== 0) {
      var message = 'A load error has ';
      if (nReceivedError > 1) {
        message = nReceivedError + ' load errors have ';
      }
      message += 'occured. See log for details.';
      alert(message);
    }
    // console warn for aborts
    if (nReceivedAbort !== 0) {
      console.warn('Data load was aborted.');
    }
    // stop listening for crtl-x
    window.removeEventListener('keydown', abortOnCrtlX);
    // hide the progress bar
    dwvjq.gui.displayProgress(100);
  });

  // handle undo/redo
  myapp.addEventListener('undo-add', function (event) {
    undoGui.addCommandToUndoHtml(event.command);
  });
  myapp.addEventListener('undo', function (/*event*/) {
    undoGui.enableLastInUndoHtml(false);
  });
  myapp.addEventListener('redo', function (/*event*/) {
    undoGui.enableLastInUndoHtml(true);
  });

  // handle key events
  myapp.addEventListener('keydown', function (event) {
    myapp.defaultOnKeydown(event);
  });

  // handle window resize
  // WARNING: will fail if the resize happens and the image is not shown
  // (for example resizing while viewing the meta data table)
  window.addEventListener('resize', myapp.onResize);

  // possible load from location
  dwvjq.utils.loadFromUri(window.location.href, myapp);
  var get_var = get_url_vars()
  //console.log(get_var["dicoms"].split(";"));
  //myapp.loadURLs(["http://localhost:8000/labcas-data/dicom/IM-0003-0132.dcm","http://localhost:8000/labcas-data/dicom/IM-0003-0133.dcm"]);

  if (localStorage.getItem('multi_dicom') != "true"){
	myapp.loadURLs(JSON.parse(localStorage.getItem('dicoms')), [{name:"Authorization", value:"Bearer "+Cookies.get('token')},{name:"contentType", value:"image/jpeg"}]);
    var state = new dwv.State();
    myapp.addEventListener('load', function () {
      var loadbutton = document.getElementById('stateLoad');
      var downbutton = document.getElementById('stateDown');
      var delbutton = document.getElementById('stateDel');
      loadbutton.disabled = false;
      downbutton.disabled = false;
      delbutton.disabled = false;

      loadbutton.onclick = function () {
        //myapp.loadURLs(["https://labcas-dev.jpl.nasa.gov/labcas-ui/assets/sass/state.json"]);
        var state_name_selected = $('#state_list option:selected').val();
        $.ajax({
            url: "https://mcl.jpl.nasa.gov/ksdb/publishhtml/?rdftype=labcas_dicom_states&filterval="+Cookies.get("user")+"-labcas_split-"+state_name_selected,
            type: 'GET',
            dataType: 'json', 
            success: function (data) {
                console.log("data-json3");
                console.log(data);
                var state = new dwv.State();
                state.apply(myapp, data);
                //dwv.State.apply(myapp,data);
            },
            error: function(e){
                console.log("Failed to grab annotation states for "+Cookies.get("user"));
            }
        });    

        //myapp.loadURLs(["https://mcl.jpl.nasa.gov/ksdb/publishhtml/?rdftype=labcas_dicom_states&filterval=dliu-labcas_split-real_test"]);
       };
      downbutton.onclick = function () {
        
        console.log(myapp.getState());
        console.log("submitting test");

        var state_name = $('#state_name_input').val();
        if (state_name == ""){
            alert("Please enter name for your annotations to be saved against!");
        }else{
            $.ajax({
                url: "https://mcl.jpl.nasa.gov/ksdb/save_labcas_dicom_state_input/",
                type: 'POST',
                dataType: "json",
                data: JSON.stringify({'userid':Cookies.get("user"), 'state_name':state_name, 'state':myapp.getState()}),
                success: function (data) {
                    alert("Successfully saved dicom state "+state_name);
                    window.location.reload();
                },
                error: function(e){
                    alert("Save failed, please reach out to david.liu@jpl.nasa.gov for support.");
                }
            });
         }
       };

        delbutton.onclick = function (){
            console.log("submitting delete");
            var state_name_selected = $('#state_list option:selected').val();
            $.ajax({
                url: "https://mcl.jpl.nasa.gov/ksdb/delete_labcas_dicom_state_input/",
                type: 'POST',
                dataType: "json",
                data: JSON.stringify({'userid':Cookies.get("user"), 'state_name':state_name_selected}),
                success: function (data) {
                    alert("Successfully deleted dicom state "+state_name_selected);
                    window.location.reload();
                },
                error: function(e){
                    alert("Delete failed, please reach out to david.liu@jpl.nasa.gov for support.");
                }
            });
        }

      $.ajax({
            url: localStorage.getItem("ksdb_labcas_dicom_state_name_api")+Cookies.get("user"),
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                $.each( data.search_results, function( key, val ) {
                    if (val != ""){
                        $('#state_list').append("<option value='"+val+"'>"+val+"</option>");
                    }
                });

            },
            error: function(e){
                console.log("Failed to grab annotation states for "+Cookies.get("user"));
            }
        });

    });
  }else{
	  var axial_list = JSON.parse(localStorage.getItem('dicoms1'));
	  var coronal_list = JSON.parse(localStorage.getItem('dicoms2'));
	  var sagittal_list = JSON.parse(localStorage.getItem('dicoms3'));
	  if (get_var["window"] && get_var["window"] == "Axial" && axial_list.length > 0){
	    myapp.loadURLs(axial_list, [{name:"Authorization", value:"Bearer "+Cookies.get('token')},{name:"contentType", value:"image/jpeg"}]);
	  }else if (get_var["window"] && get_var["window"] == "Coronal" && coronal_list.length > 0){
	    myapp.loadURLs(coronal_list, [{name:"Authorization", value:"Bearer "+Cookies.get('token')},{name:"contentType", value:"image/jpeg"}]);
	  }else if (get_var["window"] && get_var["window"] == "Sagittal" && sagittal_list.length > 0){
	    myapp.loadURLs(sagittal_list, [{name:"Authorization", value:"Bearer "+Cookies.get('token')},{name:"contentType", value:"image/jpeg"}]);
	  }
  }
  $('#window_span').html(get_var["window"]);

  
}

// Image decoders (for web workers)
dwv.image.decoderScripts = {
  jpeg2000: 'node_modules/dwv/decoders/pdfjs/decode-jpeg2000.js',
  'jpeg-lossless': 'node_modules/dwv/decoders/rii-mango/decode-jpegloss.js',
  'jpeg-baseline': 'node_modules/dwv/decoders/pdfjs/decode-jpegbaseline.js',
  rle: 'node_modules/dwv/decoders/dwv/decode-rle.js'
};

// status flags
var domContentLoaded = false;
var i18nInitialised = false;
// launch when both DOM and i18n are ready
function launchApp() {
  if (domContentLoaded && i18nInitialised) {
    startApp();
  }
}
// i18n ready?
dwv.i18nOnInitialised(function () {
  // call next once the overlays are loaded
  var onLoaded = function (data) {
    dwvjq.gui.info.overlayMaps = data;
    i18nInitialised = true;
    launchApp();
  };
  // load overlay map info
  $.getJSON(dwv.i18nGetLocalePath('overlays.json'), onLoaded).fail(function () {
    console.log('Using fallback overlays.');
    $.getJSON(dwv.i18nGetFallbackLocalePath('overlays.json'), onLoaded);
  });
});

// check environment support
dwv.env.check();
// initialise i18n
dwv.i18nInitialise('auto', 'node_modules/dwv');

// DOM ready?
$(document).ready(function () {
  domContentLoaded = true;
  launchApp();
});
