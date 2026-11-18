"use strict";
// Larger franchise histories belong in IndexedDB, not the ~5MB localStorage quota.
// Keep legacy localStorage untouched for recovery until the user explicitly resets.
const WFF_SAVE_DB="wff-franchise-saves",WFF_SAVE_STORE="saves";
let wffSaveQueue=Promise.resolve(),wffSaveWarningShown=false;
function wffOpenSaveDB(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(new Error("IndexedDB unavailable"));
  const req=indexedDB.open(WFF_SAVE_DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(WFF_SAVE_STORE))req.result.createObjectStore(WFF_SAVE_STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error("Database open failed"));
  req.onblocked=()=>reject(new Error("Database upgrade blocked by another tab"));
 });
}
async function wffDbOperation(mode,operation){
 const db=await wffOpenSaveDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(WFF_SAVE_STORE,mode),store=tx.objectStore(WFF_SAVE_STORE);
  let value;const req=operation(store);
  req.onsuccess=()=>{value=req.result};
  tx.oncomplete=()=>resolve(value);
  tx.onerror=()=>reject(tx.error||new Error("Database transaction failed"));
  tx.onabort=()=>reject(tx.error||new Error("Database transaction aborted"));
 })}finally{db.close()}
}
function wffReadPersistentSave(key){return wffDbOperation("readonly",s=>s.get(key))}
function wffWritePersistentSave(key,snapshot){
 wffSaveQueue=wffSaveQueue.catch(()=>{}).then(()=>wffDbOperation("readwrite",s=>s.put(snapshot,key)));
 return wffSaveQueue;
}
function wffDeletePersistentSave(key){
 wffSaveQueue=wffSaveQueue.catch(()=>{}).then(()=>wffDbOperation("readwrite",s=>s.delete(key)));
 return wffSaveQueue;
}
function wffWarnSaveFailure(error){
 console.error("WFF franchise save failed:",error);
 if(!wffSaveWarningShown){
  wffSaveWarningShown=true;
  alert("WFF could not save your franchise ("+(error?.name||"storage error")+"). Keep this tab open and export a backup before leaving.");
 }
}
