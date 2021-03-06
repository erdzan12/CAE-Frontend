import RoleSpace from "./lib/RoleSpace";
import ContentProvider from "./lib/ContentProvider";

const roleSpace = new RoleSpace();
const contentProvider = new ContentProvider();
const _fileDictionary = {};

let timer = null;
const _loadedScripts = {};
const _loadedCss = {};
const _hashes = {};

//initialize role space, then start the polling
roleSpace.init().then( () => {
  let componentName = roleSpace.getComponentName();
  pollFiles(componentName)
});

function nextTick(componentName){
  if( timer ){
    clearTimeout(timer);
  }
  timer = setTimeout( () => {
    pollFiles(componentName);
  }, 1000);
}

function pollFiles(componentName){
  contentProvider.getLivePreviewFiles( componentName )
    .done( ( files ) => {
        processFiles( files ).always( () => {
          nextTick(componentName);
        });
    }).fail( () => {
      nextTick(componentName);
    });
}

function getCSS(href) {
  var cssLink = $("<link>");
  $("head").append(cssLink); //IE hack: append before setting href
  cssLink.attr({
    rel:  "stylesheet",
    type: "text/css",
    href: href
  });

};

function loadStylesheets(styles){
  styles.each( function(){
    let style = $(this);
    if( style && style.attr("href") && style.attr("href").length > 0 ){
     let href = style.attr("href");
      if( typeof _loadedCss[href] == "undefined" ){
        _loadedCss[href] = 1;
        getCSS(href);
      }
    }
  });
}

function getMultiScripts(arr) {
  let deferred = $.Deferred();
  let array = false;
  function loadSingle(){
      if(arr.length == 0){
        deferred.resolve();
      }else{
        let src = arr.shift();
        $.getScript(src,loadSingle).fail(loadSingle);
      }
  }
  loadSingle();
  return deferred.promise();
}

function getHash(string){
 var hash = 0, i, chr, len;
 if (string.length === 0) return hash;
 for (i = 0, len = string.length; i < len; i++) {
   chr   = string.charCodeAt(i);
   hash  = ((hash << 5) - hash) + chr;
   hash |= 0; // Convert to 32bit integer
 }
 return hash;
}

function loadFiles(htmlDoc){
  return loadScripts(htmlDoc.filter("script[src]")).then( loadStylesheets(htmlDoc.filter("link[rel='stylesheet']")) );
}

function loadScripts(scripts){
  let inlineScripts=[];
  let dependencies = [];

  scripts.each( function(){
    let script = this;

    let src = $(script).attr("src");
    //check for applicationScript which should always be updated if it was changed
    if( src.indexOf("applicationScript.js") > -1 ){
      let hash = getHash(_fileDictionary["js/applicationScript.js"]);
      // if the applicationScript was updated ..
      if( _hashes[src] != hash ){
        //first check if it is the first load
        if( typeof _hashes[src] === "undefined" ){
          _hashes[src] = hash;
          script = $("<script type='text/javascript'/>").text(_fileDictionary["js/applicationScript.js"]);
          inlineScripts.push(script);
        }else{
          //for the application script we need to reload the whole widget after first load
          window.location.reload();
        }
      }
    }
    //collect other scripts and dependencies
    else if( typeof _loadedScripts[src] === "undefined" ){
      dependencies.push(src);
      _loadedScripts[src] = 1;
    }
  })
  //first load collected scripts/dependencies before appending the inline script, e.g. applicationScript
  return getMultiScripts(dependencies).then( () =>{
    try{
      for(let script of inlineScripts){
        $("head").append(script);
      }
    }catch(error){
      console.error(error);
    }
  });

}

function processFiles(files){
  let htmlDoc = $("");
  try{

    for(let file of files){
      _fileDictionary[file.fileName] = file.content;
    }

    let contentText = _fileDictionary["index.html"]; 
    htmlDoc = $(contentText);
    if( _hashes["index.html"] != getHash(contentText) ){
      _hashes["index.html"] = getHash(contentText);

      let inlineStyles = htmlDoc.filter("style[type='text/css']");
      $("head style[type='text/css']").remove();
      $("head").append(inlineStyles);

      let mainContent =  htmlDoc.closest("div").eq(0).html();

      //destroy old yjs instance before we can update the widget and initialize it again
      if( window.yTextarea ){
        window.yTextarea.destroy();
      }

      $("div#main-content").html( mainContent );

      $("div#main-content").height(height);
      gadgets.window.adjustHeight();

      if( typeof init === "function"){
        try{
          init();
        }catch(error){
          console.log(error);
        }
      }
    }
  }
  catch(error){
    console.log(error);
  }

  return loadFiles(htmlDoc);
}
