//----------------------------------------------  Const DECLARATION  -----------------------------------------------

const form = document.querySelector('#form-operation');
const formRestore = document.querySelector('#form-restore');
const formConnect = document.querySelector('#OPC-UA');
const json = document.querySelector('#json');
const RecipeNum = document.querySelector('#numRecipe');
const formStart = document.querySelector('#Start');
const connect = document.querySelector('#Connect');
const OF = document.querySelector('#OF');
const RN = document.querySelector('#RN');
const Sts = document.querySelector('#Status');
const Num = document.querySelector('#Num');
const IP = document.querySelector('#IP');
const usr = document.querySelector('#user');
const pw = document.querySelector('#password');
const ope1 = document.querySelector('#export');
const ope2 = document.querySelector('#restoreAll');
const ope3 = document.querySelector('#restore');
const outputPath = document.querySelector('#output-path');
const filename = document.querySelector('#filename');
const recipenumber = document.querySelector('#recipenumber');
const home = document.querySelector('#Home');
const back = document.querySelector('#Back');
const circle = document.querySelector('#circle');

let notificationTimeout;
let connSucceed = false;
let proceed = 999;
let numberMax = [];
let goodJson = 0;
let activeAlerts = 0; // Contatore per gli alert attivi
const maxAlerts = 3;  // Limite massimo di alert attivi

// const textConfirm = document.querySelector('#textConfirm');
// const confirmAction = document.querySelector('#Confirm');
// const cancelAction = document.querySelector('#Cancel');


//----------------------------------------------  Simple Function  ----------------------------------------------------

// verifico che il file sia JSON
function isFileJSON(file) {
  const acceptedFileTypes = ['json'];
  fileType = file.split('.').pop();
  return file && acceptedFileTypes.includes(fileType);
}

// Mostra a video messaggi in verde
function alertSuccess(message) {
  if (activeAlerts >= maxAlerts) return; // Verifica il limite

  activeAlerts++;
  window.Toastify.toast({
    text: message,
    duration: 5000,
    close: false,
    style: {
      background: 'green',
      color: 'white',
      textAlign: 'center',
    },
    callback: function () {
      activeAlerts--; // Decrementa quando l'alert si chiude
    },
  });
}

// mostra a video messaggi in rosso
function alertError(message) {
  if (activeAlerts >= maxAlerts) return; // Verifica il limite

  activeAlerts++;
  window.Toastify.toast({
    text: message,
    duration: 5000,
    close: false,
    style: {
      background: 'red',
      color: 'white',
      textAlign: 'center',
    },
    callback: function () {
      activeAlerts--; // Decrementa quando l'alert si chiude
    },
  });
}

// Mostra a video messaggi in verde
function statusOperation(message) {
  
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  //console.log(message);
  Sts.style.display = 'block';
  Sts.innerHTML = message;

  notificationTimeout = setTimeout(() => {
    Sts.style.display = "none";
  }, 10000); // Scompare dopo 5 secondi

}

function setProcess(value){
  proceed = value;
  Backup(proceed);
  confirmedRestore(proceed);
}

function validateIP(IP) {
  // Verifica che il campo non sia vuoto
  if (IP === '') {
    alertError('Please enter an IP');
    return false;
  }

  // Verifica che inizi con 'opc.tcp://'
  if (!IP.startsWith('opc.tcp://')) {
    alertError('Please enter a valid IP starting with opc.tcp://');
    return false;
  }

  // Estrai la parte dell'IP (escludendo 'opc.tcp://')
  let ipPort = IP.substring(10); // Rimuove 'opc.tcp://'
  
  // Dividi l'IP e la porta
  let [ip, port] = ipPort.split(':');

  // Verifica che ci sia un IP e una porta separati da ':'
  if (!ip || !port) {
    alertError('Please enter a valid IP and port');
    return false;
  }

  // Converti la porta in un numero intero
  port = parseInt(port, 10);

  // Verifica che la porta sia un numero valido e compreso tra 1 e 65535
  if (isNaN(port) || port < 1 || port > 65535) {
    alertError('Please enter a valid port number (1-65535)');
    return false;
  }

  // Verifica la validità dell'IP (deve essere nel formato IPv4)
  let ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  if (!ipRegex.test(ip)) {
    alertError('Please enter a valid IPv4 address');
    return false;
  }

  // Se tutti i controlli passano
  statusOperation(`Trying to connect to ${IP}`);
  return true;
}

function timerConnection(){
  //let tryConn;
  if (connSucceed) {
    clearTimeout(tryConn);
    //connSucceed = false;
  }else{
    tryConn = setTimeout(() => {
      alertError('Timed out connection')
      statusOperation('IP request connection timed out \n check ip and cable')
    }, 5000); // 7 secondi
  }
}


function validateRecipeNumber(recipenum, numberMax) {
  if (recipenum === 0) {
    alertError('Recipe number not valid');
    return false;
  }
  if (recipenum < 0) {
    alertError('Recipe number must be greater than 0');
    return false;
  }
  if (isNaN(recipenum)) {
    alertError('The recipe number is not a number (NaN)');
    return false;
  }
  
  // Controlla se recipenum è presente nell'array numberMax
  if (!numberMax.includes(recipenum)) {
    alertError(`The recipe number must be one of the following: ${numberMax.join(', ')}`);
    return false;
  }
  
  return true; // Aggiunto per indicare che la validazione è passata
}

function disableUI() {
  document.querySelector("#disable-overlay").style.display = "block";
  document.body.style.cursor = "wait";  // Cambia il cursore
}

function enableUI() {
  document.querySelector("#disable-overlay").style.display = "none";
  document.body.style.cursor = "default";  // Ripristina il cursore
}



//--------------------- Show Page -----------------------------------------

function goHome(){

  circle.style.backgroundColor = 'red';
  
  ipcRenderer.send('Home:Reload');
  
  OF.style.display = 'none';
  RN.style.display = 'none';
  formConnect.style.display = 'block';
  form.style.display = 'none';
  formRestore.style.display = 'none';
  Num.style.display = 'none';
  back.style.display = 'none';
  home.style.display = 'none';
  

}

function goBack(){
  
  OF.style.display = 'none';
  RN.style.display = 'none';
  formConnect.style.display = 'none';
  form.style.display = 'block';
  formRestore.style.display = 'none';
  Num.style.display = 'none';
  back.style.display = 'none';
  home.style.display = 'inline';
  form.reset();
  formRestore.reset();
  circle.style.backgroundColor = 'green';

}

function showOutput(e){
  const file = e.target.files[0];
  let jsonPath = file.path;
  ipcRenderer.send('Restore:Number',{
    jsonPath,
  });

  // Check if file is an json
  if (!isFileJSON(file.name)) {
    alertError('Please select an JSON');
    formRestore.reset();
    return;
  }
  OF.style.display = 'block';
  filename.innerHTML = file.path;
  recipenumber.innerHTML = `${[numberMax]}`;

}

function RestorePage(e, opr) {
  e.preventDefault();
  //console.log (opr);

  if (opr === '2'){

    OF.style.display = 'none';
    RN.style.display = 'none';
    formConnect.style.display = 'none';
    form.style.display = 'none';
    formRestore.style.display = 'block';
    Num.style.display = 'none';
    back.style.display = 'inline';
    home.style.display = 'inline';

  }else{

    OF.style.display = 'none';
    RN.style.display = 'none';
    formConnect.style.display = 'none';
    form.style.display = 'none';
    formRestore.style.display = 'block';
    Num.style.display = 'block';
    back.style.display = 'inline';
    home.style.display = 'inline';

  }
}

//-----------------------------------------------------------------------------------------------
//ººººººººººººººººººººººººººººººººººººººº   M A I N   ººººººººººººººººººººººººººººººººººººººººººº

function main(e) {
  try{
  e.preventDefault();
  
  /*
  if (IP.value === '' ) {
    alertError('Please enter an IP');
    return;
  }
  if (!IP.value.includes('opc.tcp') ) {
    alertError('Please enter a valid IP starting with opc.tcp');
    return;
  }
  if (!IP.value.includes('://') ) {
    alertError('Please enter a valid IP starting with ://');
    return;
  }
  if (IP.value.includes('opc.tcp') ) {
    statusOperation(`trying to connect`);
  } */
  let ConnStart = validateIP(IP.value);
  
  if (ConnStart){
    const IPopcua = IP.value;
    const User = usr.value;
    const Password = pw.value;
     console.log (IPopcua);
     console.log (User);
     console.log (Password);
    // Creo la sessione con credenziali
    //session = await createSession();
    ipcRenderer.send('Conn:Start', {
      IPopcua,
      User,
      Password,
    });
  }else{
    return;
  }
  

  }catch(err){
    statusOperation(err);
  }
    
    
}

//ººººººººººººººººººººººº  SELECT OPERATION  ºººººººººººººººººººººººº

function Operation(e) {
  e.preventDefault();
  // console.log (ope1);
  // console.log (ope2);
  // console.log (ope3);
  var opr;

  
  if (ope1.checked){
    msg = `Do you want to start the Backup?`;
    msg1 = ``;
    //faccio uscire la pagina di Confirm Action
    ipcRenderer.send('Page:OpenDialog', {
      msg,
      msg1,
    });
  }
  if (ope2.checked){
    opr=ope2.value
    formStart.addEventListener('submit', RestorePage(event, opr));
  }
  if (ope3.checked){
    opr=ope3.value
    formStart.addEventListener('submit', RestorePage(event, opr));
  }
  //console.log (opr);   
}

function Backup(proceed) {
  
  var opr;
  
  if (ope1.checked){
    if (proceed === 0){
      opr=ope1.value
      ipcRenderer.send('Operation1:Start', {
        opr,
      });
      proceed = 999;
    }
  }  
}


//ºººººººººººººººººººººººº  RESTORE  ººººººººººººººººººººººººººººººººº


function Restore(e){
  e.preventDefault();
  if (goodJson === 0){
    try{
      const file = json.files[0].name;
      const destFile = json.files[0].path;
      
    
      if (!isFileJSON(file)) {
        alertError('Please select an JSON');
        return;
      }

      var opr;
      if (ope2.checked){
        opr=ope2.value
      }
      if (ope3.checked){
        opr=ope3.value
      }

      if (opr === '2'){

        // Check if file is an json
        if (!isFileJSON(file)) {
          alertError('Please select an JSON');
          return;
        }

        // name and output path
        filename.innerHTML = destFile;

        msg = `Do you want to Restore file Recipe: \n${file}`;
        msg1 = ``;
        //faccio uscire la pagina di Confirm Action
        ipcRenderer.send('Page:OpenDialog', {
          msg,
          msg1,
        });

      }else{
        let numRecipe = RecipeNum.value;
        numRecipe = parseInt(numRecipe);

        console.log(numRecipe);
        if (!validateRecipeNumber(numRecipe, numberMax)){
          return;
        }    

        // Check if file is an json
        if (!isFileJSON(file)) {
          alertError('Please select an JSON');
          return;
        }

        // name and output path
        filename.innerHTML = destFile;
        msg = `Do you want to Restore file Recipe: \n${file}`;
        msg1 = `and number Recipe: ${numRecipe}`;
        //faccio uscire la pagina di Confirm Action
        ipcRenderer.send('Page:OpenDialog', {
          msg,
          msg1,
        });
        
      }
    }catch(err){
      alertError('no file selected')
    }
  }else{
    alertError('Invalid JSON');
  }
}

function confirmedRestore(proceed){
  const numRecipe = RecipeNum.value;
  const destFile = json.files[0].path;

  var opr;

  if (ope2.checked){
    opr=ope2.value
  }
  if (ope3.checked){
    opr=ope3.value
  }

  if (opr === '2'){
    if (proceed === 0){
      ipcRenderer.send('Operation2:Start', {
        destFile,
      });
      proceed = 999;
    }
  }
  if (opr === '3'){
    if (proceed === 0){
      ipcRenderer.send('Operation3:Start', {
        numRecipe,
        destFile,
      });
      proceed = 999;
    }
  }
}


//--------------------------------------------------------  IPC Render ON  ------------------------------------------------

//--------------------- Connection Disconnection -----------------------------

ipcRenderer.on('Conn:done', (recived) => {
  alertSuccess(`Connection Succeeded at ${IP.value}`);
  statusOperation('Connection Done');
  if (recived.data === 1 ){
    formConnect.style.display = 'none';
    form.style.display = 'block';
    formRestore.style.display = 'none';
    OF.style.display = 'none';
    RN.style.display = 'none';
    back.style.display = 'none';
    circle.style.backgroundColor = 'green';
    home.style.display = 'inline';
  }
});

ipcRenderer.on('Disconnect:Done', () => 
  alertSuccess(`Disconnection Succeeded!`)
);

//----------------------- Backups-----------------------------------

ipcRenderer.on('Backup:Start', () =>
  statusOperation(`Backup Started`)
);

ipcRenderer.on('Backup:S_Multiplexing', (recived) => {
  statusOperation(`Backup started! Number of recipes: ${recived.data}`)
});

ipcRenderer.on('Backup:Multiplexing', () =>
  statusOperation(`Multiplexing recipes...`)
);

ipcRenderer.on('Backup:D_Multiplexing', (recived) => {
  statusOperation(`Multiplexing completed! Number of nodes: ${recived.data}`)
});

ipcRenderer.on('Backup:Processing_recipe', (recived) => {
  statusOperation(`Processing recipe : ${recived.data}`)
});

ipcRenderer.on('Backup:Processing_recipe_skip', (recived) => {
  statusOperation(`The recipe ${recived.data} is empty, skipping... If this is not intended, please check the recipe name`)
});

ipcRenderer.on('Backup:S_Reading_recipe', () => 
  statusOperation(`Reading recipe data...`)
);

ipcRenderer.on('Backup:Reading_recipe', (recived) => {
  statusOperation(`Reading recipe data... ${recived.data}/${recived.data1}`)
});

ipcRenderer.on('Backup:D_Reading_recipe', () => {
  statusOperation(`Recipe data read!`);
  enableUI();
});

ipcRenderer.on('Backup:S_gathering_leafs', () => 
  statusOperation(`Gathering leaf nodes for the basic recipe structure...`)
);

ipcRenderer.on('Backup:D_gathering_leafs', () => 
  statusOperation(`Leaf nodes gathered!`)
);

ipcRenderer.on('Backup:Done', (recived) => {
  alertSuccess('Backup Done');
  statusOperation(`Backup completed! Data saved in ${recived.data}`);
  enableUI();
});


//--------------------------- restore ----------------------------------

ipcRenderer.on('Restore:NumberGet', (recived) => {
  numberMax = recived.data;
  if (ope3.checked){
    RN.style.display = 'block';
    recipenumber.innerHTML = `${[numberMax]}`;
  }
});

ipcRenderer.on('Restore:Start', () =>
  statusOperation(`Restore Started`)
);

ipcRenderer.on('Restore:S_Restoring', (recived) => {
  statusOperation(`Restoring recipe ${recived.data}...`)
});

ipcRenderer.on('Restore:D_Restoring', (recived) => {
  statusOperation(`Recipe ${recived.data} restored!`);
  alertSuccess(`Recipe ${recived.data} restored!`);
  enableUI();
});

ipcRenderer.on('RestoreAll:Start', () =>
  statusOperation(`RestoreAll Started`)
);

ipcRenderer.on('RestoreAll:S_Restoring', () =>
  statusOperation(`Restoring all recipes...`)
);

ipcRenderer.on('RestoreAll:D_Restoring', () => {
  statusOperation(`All recipes restored!`);
  alertSuccess('All recipes restored!');
  enableUI();
});

ipcRenderer.on('Restore:S_writing_data', () => 
  statusOperation(`Writing recipe data...`)
);

ipcRenderer.on('Restore:writing_data', (recived) => {
  statusOperation(`Writing recipe data... ${recived.data}/${recived.data1}`)
});


//----------------------------- Error -----------------------------------

ipcRenderer.on('Err:Connection',(recived) => {
  alertError(`Connection failed at ${IP.value}`);
  statusOperation(`Can't connect, check ip and cable `); //\n ${recived.data}
});

ipcRenderer.on('Err:Connection_Session',(recived) => {
  alertError(`Connection failed at ${IP.value}`);
  statusOperation(`wrong user and password `);
  connSucceed = true;
  timerConnection();
});

ipcRenderer.on('Err:Backups',(recived) => {
  alertError(`Backup failed at ${IP.value}`);
  statusOperation(`${recived.data}`);
});

ipcRenderer.on('Err:Restore',(recived) => {
  alertError(`Restore failed at ${IP.value}`);
  statusOperation(`${recived.data}`);
});

ipcRenderer.on('Err:RestoreAll',(recived) => {
  alertError(`Restore All failed at ${IP.value}`);
  statusOperation(`${recived.data}`);
});

ipcRenderer.on('Err:Disconnect',(recived) => {
  alertError(`Disconnection failed at ${IP.value}`);
  statusOperation(`${recived.data}`);
});

ipcRenderer.on('Err:Checksum',() => {
  alertError(`Diffrent Checksum of the file`);
});

ipcRenderer.on('Err:ChecksumMetadata',() => {
  alertError(`Diffrent Checksum adn Metadata of the file`);
});


ipcRenderer.on('Err:Metadata',() => {
  alertError(`Diffrent Metadata of the file`);
});

ipcRenderer.on('InvalidFile',(recived) => {
  goodJson = recived.data;
});
ipcRenderer.on('ValidFile',(recived) => {
  goodJson = recived.data;
});


//------------------------------ dialog ----------------------------

ipcRenderer.on('Dialog:Success', (recived) => {
  // statusOperation(`operation go ${recived.data}`);
  disableUI();
  setProcess(recived.data);
});

ipcRenderer.on('Dialog:Closed', (recived) => {
  statusOperation(`Operation cancelled!`);
});

ipcRenderer.on('Timer:start', () => {
  connSucceed = false;
  timerConnection();
});

ipcRenderer.on('Timer:stop', () => {
  connSucceed = true;
  timerConnection();
});



//--------------------------------------------------------  Event Listener  -------------------------------------------------

formConnect.addEventListener('submit', main);

form.addEventListener('submit', Operation);

formRestore.addEventListener('submit', Restore);

home.addEventListener('click', goHome);

back.addEventListener('click', goBack);

json.addEventListener('change', showOutput);

