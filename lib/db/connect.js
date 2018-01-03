var MongoClient = require('mongodb').MongoClient;
var conf=require('../conf').db;
var url =conf.adapter;
var DB,callbackArr=[];

console.info("DB Adapter Connecting...");
MongoClient.connect(url, function(err, db) {
    if(err){
        console.warn('!!Adapter db connect ERROR!',err.toString())
    }else
        console.info("DB Adapter Connected correctly!");

    DB=db;
    callbackArr.forEach(function(fn){
        fn(db);
    })


    // db.close();
});
exports.getDB = function(fn) {
    if(typeof fn=='function'){
        if(DB){
            fn(DB)
        }else{
            callbackArr.push(fn);
        }
    }
    return DB;
};


