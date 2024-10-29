// ----------------------------------------  licences  ----------------------------------------------
/*
---------------------------  electron  -------------------------------------------

MIT License for electron  (v. 20.3.12)

Copyright (c) Electron contributors

Copyright (c) 2013-2020 GitHub Inc.


------------------------  node-opcua-client  -----------------------------------------

The MIT License (MIT) for node-opcua-client  (v. ^2.133.0)

Copyright (c) 2022-2024  Sterfive SAS - 833264583 RCS ORLEANS - France (https://www.sterfive.com)

Copyright (c) 2014-2022 Etienne Rossignon


----------------------- toastify-js ----------------------------------------------------

MIT License for toastify-js  (v. ^1.12.0)

Copyright (c) 2018 apvarun

*/
// -------------------------------------  Require & Const -------------------------------------

const path = require('path');
const os = require('os');
const fs = require('fs');
const events = require('events');
const crypto = require('crypto');
const { app, BrowserWindow, Menu, ipcMain, shell, clipboard, dialog } = require('electron');
const {
  OPCUAClient,
  AttributeIds,
  CloseSessionRequest,
} = require("node-opcua-client");
const Settings = require("./settings");
const numeriUnici = new Set();

const isDev = process.env.NODE_ENV === 'production'; // !== for dev mode
const isMac = process.platform === 'darwin';

// Metadati da aggiungere
const metadata = {
  Author: "TMG IMPIANTI S.p.A",
  ProductAppName: "ImpoExpo_Recipes_TMG",
  TypeFile: ".json"
};

let mainWindow;
let aboutWindow;
events.EventEmitter.defaultMaxListeners = 10000;


// -------------------------------------  Main Window  -----------------------------------------

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1600 : 1280,
    height: 820,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Show devtools automatically if in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

    // mainWindow.loadURL(`file://${__dirname}/renderer/index.html`);
   mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}


// ------------------------------------  About Window  -----------------------------------------

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
    title: 'About Electron',
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
  });

   aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

// ºººººººººººººººººººººººººººººººººººººººº
// When the app is ready, create the window
app.on('ready', () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Remove variable from memory
  mainWindow.on('closed', () => (mainWindow = null));
});


// -----------------------------------------  Menu template  ------------------------------------------------

const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac
    ? [
        {
          label: 'Help',
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  // {
  //   label: 'File',
  //   submenu: [
  //     {
  //       label: 'Quit',
  //       click: () => app.quit(),
  //       accelerator: 'CmdOrCtrl+W',
  //     },
  //   ],
  // },
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
          ],
        },
      ]
    : []),
];


//-----------------------------------------------------  IPC  ----------------------------------------------------------------------


ipcMain.on('Page:OpenDialog', (e,options) => {
  dialog.showMessageBox(mainWindow, {
      'type': 'question',
      'title': 'Confirm Action',
      'message': `${options.msg} \n\n${options.msg1}`,
      'buttons': [
          'Yes',
          'No'
      ],
  })
      // Dialog returns a promise so let's handle it correctly
      .then((result) => {
          // Bail if the user pressed "No" or escaped (ESC) from the dialog box
          if (result.response !== 0) { 
            //console.log(result.response);
            mainWindow.webContents.send('Dialog:Closed', {data:result.response});
            return; 
          }

          // Testing.
          if (result.response === 0) {
              //console.log('The "Yes" button was pressed (main process)');
        
              // Reply to the render process
              mainWindow.webContents.send('Dialog:Success', {data:result.response});
              return;
          }

          
      })
})

ipcMain.on('Restore:Number', (e,options) => {
  //console.log(`${options.jsonPath}`);
  const data = require (`${options.jsonPath}`);
  if(!verifyJsonFile(data)){
    mainWindow.webContents.send('InvalidFile', {data:1});
    return;
  };
  const recipeData = data.recipes.data;
  mainWindow.webContents.send('ValidFile', {data:0});
  for(i=0;i<recipeData.length;i++){
    temp = recipeData[i];
    nameid = temp.nodeId
    let num = getThirdCharAfterRecipe(nameid);
    num = parseInt(num);
    num = num + 1;
    //console.log(num +1);
    aggiungiNumero(num);
  }
  //console.log(Array.from(numeriUnici));
  let arrNumRecipe = Array.from(numeriUnici);
  mainWindow.webContents.send('Restore:NumberGet', {data:arrNumRecipe});
  numeriUnici.clear();
});

// Respond to the ipcRender.send Event
ipcMain.on('Conn:Start', async (e, options) => {
  //console.log(options);
  try {
    let ClientData = await createSessionConn(options);
    let session = ClientData[0];
    let client = ClientData[1];
  

    dest = path.join(os.homedir(), 'ImpoExpo_Backup_Recipes');
    // Create destination folder if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    ipcMain.on('Home:Reload', async (e) => {
      try {
        await client.disconnect();
        mainWindow.reload();
        mainWindow.webContents.send('Disconnect:Done');
      } catch (error) {
        mainWindow.webContents.send('Err:Disconnect', {data:error});
      }
    });

    ipcMain.on('Operation1:Start', async (e,operation) => {
      operation.dest = path.join(os.homedir(), 'ImpoExpo_Backup_Recipes');
      mainWindow.webContents.send('Backup:Start');
      await startBackup(session, operation.dest);
    });

    ipcMain.on('Operation2:Start', async (e,operation) => {
      mainWindow.webContents.send('RestoreAll:Start');
      await restoreAll(operation.destFile, session);
    });

    ipcMain.on('Operation3:Start', async (e,operation) => {
      mainWindow.webContents.send('Restore:Start');
      await restoreRecipe(operation.numRecipe, operation.destFile, session);
    });
  } catch (error) {
    console.error(error);
  }
});


//------------------------------------------------  FUNCTIONS  ----------------------------------------------------------------------


async function getLeafNodes(nodeId, session) {
  //array di nodi foglia
  const result = [];

  //array di nodi da esplorare
  const queue = [nodeId];

  mainWindow.webContents.send('Backup:S_gathering_leafs');

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    let browseResult;

    //Prova a esplorare il nodo corrente
    browseResult = await session.browse(currentNodeId);

    //lista dei figli del nodo corrente
    const references = browseResult.references;

    //se il nodo corrente non ha figli, è un nodo foglia
    if (references.length === 0) {
      //aggiunge il nodo all'array dei nodi foglia
      result.push(currentNodeId.value);
    } else {
      //se il nodo ha figli, aggiunge i figli alla coda per esplorarli
      references.forEach((reference) => queue.push(reference.nodeId));
    }
  }
  //aggiorna lo stato con il messaggio che ha finito di raccogliere i nodi foglia
  mainWindow.webContents.send('Backup:D_gathering_leafs');
  
  return result;
}

//data una lista di nodi, legge i valori di tutti i nodi in parallelo e ritorna un array di oggetti con i valori letti
async function processQueueRead(nodes, session, maxThreads) {
  //array di risultati
  let results = [];
  //numero totale di nodi e contatore di quelli processati per tenere traccia del progresso
  const totalNodes = nodes.length;
  let processedNodes = 0;

  mainWindow.webContents.send('Backup:S_Reading_recipe');
  
  //finché ci sono nodi da processare
  while (nodes.length > 0) {
    //prende un batch di nodi da processare
    const batch = nodes.splice(0, maxThreads);

    //da quelli crea un array di promesse che leggono i valori dei nodi
    const batchPromises = batch.map(async (nodeId) => {
      //incrementa il contatore dei nodi processati e aggiorna lo stato
      processedNodes++;
      if (processedNodes % 100 === 0 || processedNodes === totalNodes) {

        mainWindow.webContents.send('Backup:Reading_recipe', {data:processedNodes, data1:totalNodes});
  
      }
      //legge il valore del nodo
      const nodeData = await session.read({ nodeId });

      //ritorna un oggetto con l'id del nodo e il valore letto
      return { nodeId, value: nodeData };
    });

    //Le operazioni elencate sopra vengono eseguite in parallelo

    const batchResults = await Promise.all(batchPromises);

    //concatena i risultati del batch con quelli totali
    results = results.concat(batchResults);
  }
  mainWindow.webContents.send('Backup:D_Reading_recipe');

  return results;
}

//esegue il multiplexing delle ricette, per accorciare i tempi di lettura
async function multiplexRecipes(childrenArray, recipeStructure, session) {
  //array di nodi di tutte le ricette
  const allRecipesNodes = [];

  // per ogni ricetta, aggiunge i nodi alla lista
  for (let i = 0; i < childrenArray.length; i++) {
    mainWindow.webContents.send('Backup:Processing_recipe', {data:i});
    //console.log(`Processing recipe ${i}`);

    //legge il nome della ricetta
    const recipeName = await getRecipeName(
      session,
      childrenArray[i].nodeId.value
    );

    // se la ricetta non è vuota, aggiunge i nodi alla lista
    if (!isEmptyRecipe(recipeName)) {
      addRecipeNodes(allRecipesNodes, recipeStructure, i);
    } else {
      mainWindow.webContents.send('Backup:Processing_recipe_skip', {data:i});
    }
  }

  return allRecipesNodes;
}

async function processQueueWrite(nodes, session) {
  // numero totale di nodi e contatore di quelli processati per tenere traccia del progresso
  const totalNodes = nodes.length;
  let processedNodes = 0;

  mainWindow.webContents.send('Restore:S_writing_data');

  nodes.forEach(async node => {
    processedNodes++;
    if (processedNodes % 100 === 0 || processedNodes === totalNodes) {
      mainWindow.webContents.send('Restore:writing_data', {data:processedNodes, data1:totalNodes});
    }
    const status = await writeNodeValue(session, node.nodeId, node.value.value.value, node.value.value.dataType)
  });
}

async function writeNodeValue(session, nodeId, value, dataType = "Int16") {
  const writeValue = {
    nodeId,
    attributeId: AttributeIds.Value,
    value: {
      value: {
        dataType,
        arrayType: "Scalar",
        value,
      },
      dataType: undefined,
    },
  };
  try{
  const status = await session.write(writeValue);
  return status;
  }catch(err){
    console.error(err);
  }
  // console.log(
  //   "Node: " + nodeId + "; Value: '" + value + "'; Status: " + status._name
  // );
  
}

// Helper function -> legge il nome della ricetta
async function getRecipeName(session, nodeIdValue) {
  const result = await session.read({
    nodeId: `ns=3;s=${nodeIdValue}."Name"`,
  });
  return result.value.value;
}

// Helper function -> controlla se la ricetta è vuota (non compilata, quindi con il parametro "name" a default)
function isEmptyRecipe(recipeName) {
  return recipeName.includes("--");
}

// Helper function -> aggiunge i nodi della ricetta alla lista
function addRecipeNodes(allRecipesNodes, recipeStructure, index) {
  recipeStructure.forEach((node) => {
    allRecipesNodes.push(`ns=3;s=${node.replace("[0]", `[${index}]`)}`);
  });
}

function getThirdCharAfterRecipe(str) {
  const keyword = "Recipe";
  const periodIndex = str.indexOf(".");

  // Verifica se c'è un punto nella stringa
  if (periodIndex !== -1) {
      // Cerca "Recipe" dopo il punto
      const index = str.indexOf(keyword, periodIndex);
      
      // Controlla se "Recipe" è presente e se c'è un terzo carattere dopo di esso
      if (index !== -1 && index + keyword.length + 3 <= str.length) {
          return str.charAt(index + keyword.length + 2); // Terzo carattere dopo "Recipe"
      } else {
          return "Non c'è un terzo carattere dopo 'Recipe' o 'Recipe' non è presente dopo il punto.";
      }
  } else {
      return "Non è presente un punto nella stringa.";
  }
}

function aggiungiNumero(numero) {
  if (typeof numero === 'number') {
    numeriUnici.add(numero);
  } else {
    console.log("Gatto Pardo leandrino");
  }
}


async function showSave(file, data, fileDestDefault, dest) {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: `Save the file: ${file}`,
      defaultPath: `${fileDestDefault}`, // Nome predefinito per il file
      buttonLabel: 'Save',
      modal: true,
      parent: mainWindow,
      filters: [
          { name: 'Json Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
      ]
  });

  if (!canceled && filePath) {
      fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      return filePath; // restituisce il percorso salvato
  }else{
    fs.writeFileSync(
      fileDestDefault,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    return dest;
  }
};

// Funzione per calcolare il checksum
function calculateChecksum(data) {
  const hash = crypto.createHash('sha256'); // Usa l'algoritmo di hashing che preferisci
  hash.update(JSON.stringify(data)); // Converti i dati in una stringa JSON
  return hash.digest('hex'); // Restituisci il checksum in formato esadecimale
}

// Funzione per verificare il checksum del file JSON
function verifyJsonFile(jsonData) {
  try {
      // Leggi il file JSON
      // const fileContent = fs.readFileSync(filePath, 'utf-8');
      // const jsonData = JSON.parse(fileContent);

      // Estrai il checksum e i dati delle ricette
      const storedChecksum = jsonData.checksum;
      const recipesData = jsonData.recipes;
      const recipesMetadata = jsonData.recipes.metadata;
      
      if (areMetadataEqual(recipesMetadata, metadata)){

        // Calcola il checksum dai dati delle ricette
        const calculatedChecksum = calculateChecksum(recipesData);

        // Confronta i checksum
        if (storedChecksum === calculatedChecksum) {
            console.log('Il file JSON non è stato modificato.');
            return true;
        } else {
            console.log('Il file JSON è stato modificato!');
            mainWindow.webContents.send('Err:Checksum');
            return false;
        }
     }else{
        console.log('metadata err');
        mainWindow.webContents.send('Err:Metadata');
        return false;
     }
  } catch (error) {
      console.error('Errore nella verifica del file JSON:', error.message);
      mainWindow.webContents.send('Err:ChecksumMetadata');
      return false;
  }
}

function areMetadataEqual(recipesMetadata, metadata) {
  // Controlla se entrambi sono oggetti
  if (typeof recipesMetadata !== 'object' || typeof metadata !== 'object') {
      return false;
  }
  
  // Ottieni le chiavi di entrambi gli oggetti
  const recipesKeys = Object.keys(recipesMetadata);
  const metadataKeys = Object.keys(metadata);

  // Controlla se hanno lo stesso numero di chiavi
  if (recipesKeys.length !== metadataKeys.length) {
      return false;
  }

  // Controlla se ogni chiave e valore corrispondono
  for (let key of recipesKeys) {
      if (recipesMetadata[key] !== metadata[key]) {
          return false;
      }
  }

  return true; // Gli oggetti sono uguali
}


//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//ººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººº  M A I N  F U N C T I O N S  ººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººººº


async function startBackup(session, dest) {
  //console.log(Settings);
  try {
    //nodo di partenza che contiene tutte le ricette
    const nodo = await session.browse(Settings.wellKnownNodes.DBNode);
    const childrenArray= nodo.references;

    const childLength = childrenArray.length;
    mainWindow.webContents.send('Backup:S_Multiplexing', {data:childLength});

    //struttura della prima ricetta, praticamente si crea una lista di nodi foglia.
    const recipeStructure = await getLeafNodes(childrenArray[0].nodeId, session);

    mainWindow.webContents.send('Backup:Multiplexing');
    /*
      visto che tutte le ricette avranno la stessa struttura, non c'è bisogno di rileggere la struttura per ogni ricetta, posso riciclare la struttura della prima e farci un multiplexing.
      Questo passaggio comprende anche un'ottimizatione:
      Controlla il nome della ricetta che sta per aggiungere alla lista, se il nome contiene "--" dò per scontato che la ricetta senza nome non sia stata compilata e quindi non la multiplexo.
    */
    
    const allRecipesNodes = await multiplexRecipes(
      childrenArray,
      recipeStructure,
      session
    )
    const len = allRecipesNodes.length;
    mainWindow.webContents.send('Backup:D_Multiplexing', {data:len});

    //legge i valori di tutti i nodi in parallelo
    const allRecipesData = await processQueueRead(
      allRecipesNodes,
      session,
      Settings.concurrencyLimit.Backup
    );

  const allData = {
    metadata, // Metadati
    data: allRecipesData // Dati delle ricette
};

    //console.log(session);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Mesi da 0 a 11
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const timestamp = `${year}_${month}_${day}-${hours}_${minutes}`;


    const controllerNum = await session.read({
      nodeId: Settings.wellKnownNodes.FileRecipeToImport, //------------------------------------------------------------------------------------------       <----- Inserire nodo dove è la variabile che mi dice in numero del controller
    });

    //console.log(session);

    // Salva i dati in un file JSON, includendo il timestamp nel nome del file
    const fileName = `recipesData_Controller${controllerNum.value.value}_${timestamp}.json`;  //${pathBackup}/
    var fileDestDefault = path.join(dest, fileName);
    const checksum = calculateChecksum(allData);

    // Crea un oggetto con checksum e i dati delle ricette
    const outputData = {
        checksum,
        recipes: allData
    };
    var fileDest = await showSave(fileName,outputData,fileDestDefault, dest);

    console.log(`Dati salvati in ${fileDest} con checksum: ${checksum}`);
    
    // var fileDest = path.join(dest, fileName);
    // const file = fs.writeFileSync(
    //   fileDest,
    //   JSON.stringify(allRecipesData, null, 2)
    // );


    mainWindow.webContents.send('Backup:Done', {data:fileDest});

    // apro la cartella nel file explorer
    //shell.openPath(fileDest);

  }catch(error){
    console.error(error);
    mainWindow.webContents.send('Err:Backups', {data:error});
  }
}


async function restoreAll(fileRecipe, session) {
  try{

    //console.log(fileRecipe);

    const AllRecipesNodes = require(`${fileRecipe}`);   
    
    const allRecipesData = AllRecipesNodes.recipes.data;

    mainWindow.webContents.send('RestoreAll:S_Restoring');

    // scrive i valori di tutti i nodi in parallelo dal file JSON
    await processQueueWrite(allRecipesData, session);

    mainWindow.webContents.send('RestoreAll:D_Restoring');

    //console.log('all good');
  }catch(error){
    console.error(error);
    mainWindow.webContents.send('Err:RestoreAll', {data:error});
  }
}

async function restoreRecipe(recipeNum, fileRecipe, session) {
  try{
    // controlla che il parametro passato sia valido
    const AllRecipesNodes = require(`${fileRecipe}`);     
    
    const allRecipesData = AllRecipesNodes.recipes.data;

    mainWindow.webContents.send('Restore:S_Restoring', {data:recipeNum});

    // filtra i nodi della ricetta specifica
    const recipeNodes = allRecipesData.filter((element) =>
      // recipeNum - 1 perché dal server opcua la lista parte da 0 ma da plc parte da 1, quindi quando mi viene passata una ricetta
      // devo tenere conto che la lista delle ricette visibili parte da 1 e non da 0
      element.nodeId.includes(`Recipe"[${recipeNum - 1}]`)
    );

    const concurrencyLimit = Settings.concurrencyLimit.RestoreOneRecipe;

    // scrive i valori di tutti i nodi della ricetta in parallelo
    await processQueueWrite(recipeNodes, session, concurrencyLimit);

    mainWindow.webContents.send('Restore:D_Restoring', {data:recipeNum});

  }catch(error){
    console.error(error);
    mainWindow.webContents.send('Err:Restore', {data:error});
  }
}

//Crea una sessione con il server OPC UA con credenziali
async function createSessionConn({IPopcua, User, Password}) {
  try{
    //console.log (IPopcua);
    //console.log (User);
    //console.log (Password);
    const client = OPCUAClient.create({ requestedSessionTimeout: 9999999999999, endpointMustExist: true });
    //client.closeSession(IPopcua)
    mainWindow.webContents.send('Timer:start');
    await client.connect(IPopcua);

    //console.log(client);
    try{
      const session = await client.createSession({
        userName: User,
        password: Password
      });

      mainWindow.webContents.send('Conn:done', {data:1});

      //console.log(session);
      //console.log(client);
      mainWindow.webContents.send('Timer:stop');
      return [session, client];
    }catch(error){
      await client.disconnect();
      console.error(error);
      mainWindow.webContents.send('Err:Connection_Session', {data:error});
    }
  }catch(error){
    //mainWindow.webContents.send('Conn:failed', {data:err});
    //
    console.error(error);
    mainWindow.webContents.send('Err:Connection', {data:error});
  }
}


//---------------------------------------------------------------  ON CLOSE  -------------------------------------------------------------------------------------

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

// Open a window if none are open (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
