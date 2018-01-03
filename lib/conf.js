
var app = new require('koa');
var env=app.env;
var path=require('path')

module.exports ={
    main:function(env){
        var json;
        switch (env){
            case 'development':
                json= require('../conf/main-dev.json')
                break
            case 'online':
            default :
                json= require('../conf/main.json')
                break
        }
        var paths=json.path;
        for(var k in paths){
            if(!/^\//.test(paths[k]))
            paths[k]=path.join(__dirname, '../conf',paths[k]);
            //console.log(paths[k])
        }

        return json;
    }(env),
    db:function(env){
        var json;
        switch (env){
            case 'development':
                json= require('../../configs/db-dev.json')
                break
            case 'online':
            default :
                json= require('../../configs/db.json')
                break
        }
        return json;
    }(env)

}