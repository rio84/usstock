/**
 * Created by wurui on 06/08/2017.
 */
"use strict";

const dbcon = require('../lib/db/connect');
const mongodb = require('mongodb');


class ModelBase {

    constructor(fieldsconf, collectionName) {
        if (!fieldsconf || !fieldsconf.length) {
            throw new Error('fieldsconf required')
        }
        this.fieldsConfig = fieldsconf;
        this.listfilter = {
            _ds_id: 0,
            _cts: 0,
            _mts: 0
        };

        collectionName && dbcon.getDB((db) => {
            
            this.collection = this.collection || db.collection(collectionName);
        });
    }

    _filterfields(data, forcecomplete) {
        var result = {},
            fieldsConfig = this.fieldsConfig;
        if (!fieldsConfig || !fieldsConfig.length) {
            return data
        }
        for (var i = 0, fieldconf; fieldconf = fieldsConfig[i++];) {
            if (typeof fieldconf == 'string') {
                fieldconf = {
                    name: fieldconf,
                    type: 'string'
                }
            }
            var fieldname = fieldconf.name,
                val = data[fieldname];
            if (forcecomplete) {
                if (val === undefined || val === null) {
                    val = fieldconf.defaultValue;
                }
                if (fieldconf.required && !val) {
                    return false;
                }
            }
            if (val !== undefined) {
                switch (fieldconf.type) {
                    case 'number':
                        val = val - 0;
                        break
                    case 'json':
                        (typeof val == 'string') && (val = JSON.parse(val))
                        break
                    case 'array':
                        val = val.split(',');
                        break
                }
                result[fieldconf.name] = val
            }


        }

        return result
    }

    _getfieldconfig(fieldname) {
        for (var i = 0, fieldconf; fieldconf = this.fieldsConfig[i++];) {
            if (typeof fieldconf == 'string') {
                fieldconf = {
                    name: fieldconf,
                    type: 'string'
                }
            }
            if (fieldname === fieldconf.name) {
                return fieldconf
            }
        }

    }
    ObjectID(_id) {
        if (!/^[a-f0-9]{24}$/.test(_id)) {
            return _id;
        }
        return new mongodb.ObjectID(_id)
    }

    getlist(data, filter, fn) {
        if (typeof filter == 'function') {
            fn = filter;
            filter = null;
        }
        var q = data.query || {};
        q._ds_id = data._ds_id;

        this.collection.find(q, filter || this.listfilter).sort({
            _cts: -1
        }).toArray(fn);
    }

    getmy(data, filter, fn) {
        if (typeof filter == 'function') {
            fn = filter;
            filter = null;
        }
        if (!data.uid) {
            fn('no uid')
        }
        data.query.uid = data.uid;
        this.getlist(data, filter, fn)
    }
    search(data, filter, fn) {
        this.getlist(data, filter, fn)
    }
    getone(data, filter, fn) {

        if (typeof filter == 'function') {
            fn = filter;
            filter = null;
        }

        if (data.fieldname) {
            return this.getfield(data, data.fieldname, fn)
        }

        filter = filter || {
            _ds_id: 0,
            _cts: 0,
            _mts: 0
        };
        var q = data.query || {};
        if (data._id) {
            q = {
                _id: this.ObjectID(data._id)
            };
        }
        q._ds_id = data._ds_id;

        this.collection.find(q, filter).limit(1).toArray((e, r) => {
            fn(e, r && r[0]);
        });
    }

    post(data, fn) {
        if(!data.body){
            return fn('post body required')
        }
        data.body.uid=data.uid;

        var insert_data = this._filterfields(data.body, true);
        if (!insert_data) {
            return fn('fields not completed')
        }
        insert_data._ds_id = data._ds_id;
        insert_data._cts = Date.now();

        this.collection.insert(insert_data, (e, r) => {
            var ret = {
                code: 0,
                message: ''
            };
            if (r.insertedCount == 1) {
                ret.message = r.insertedIds[0];
            } else {
                ret.code = 1;
                ret.message = e || 'error'
            }
            fn && fn(null, ret)
        });
    }

    put(data, fn) {
        var $set = {};
        var insert_data = this._filterfields(data.body);
        for (var k in insert_data) {
            $set[k] = insert_data[k]
        }
        var selector = {
            _id: this.ObjectID(data._id),
            _ds_id: data._ds_id
        };
        if (data.uid) {
            selector.uid = data.uid;
        }
        this.collection.update(selector, {
            $set: $set
        }, (e, r) => {

            if (r && r.result && r.result.n == 1) {
                fn && fn(null, {
                    code: 0,
                    message: 'ok! Modified ' + r.result.nModified
                })
            } else {
                fn && fn(null, {
                    code: 1,
                    message: e || 'can not find target'
                })
            }
        });
    }

    del(data, fn) {/*
        目前post中允许无uid字段
        页del中又必传uid，会造成删除不掉的问题啊
        要统一的话，要么post必传uid，要么del允许无uid
        这个问题后面再根据场景作处理吧，目前先这样，无uid字段del就删除不掉，也算合理
        */
        var selector = {
            _id: this.ObjectID(data._id),
            _ds_id: data._ds_id
        };
        if (data.uid) {
            selector.uid = data.uid;
        }
        this.collection.remove(selector, (e, r) => {
            //{ ok: 1, n: 1 }
            if (r && r.result && r.result.n == 1) {
                fn && fn(null, {
                    code: 0,
                    message: 'ok'
                })
            } else {
                fn && fn(null, {
                    code: 1,
                    message: 'can not find target'
                })
            }
        });
    }

    putfield(data, fieldname, fn) { //console.log(data,fieldname)
        var $update = {},
            val = data.body[fieldname] || data.body.value,
            fieldconf = this._getfieldconfig(fieldname),
            selector = {
                _id: this.ObjectID(data._id),
                _ds_id: data._ds_id
            };
        if (!fieldconf) {
            return fn && fn('can not find field ' + fieldname)
        }
        data.uid && (selector.uid = data.uid);
        var oper = '$set';
        switch (fieldconf.type) {
            case 'array':
                oper = '$addToSet'
                break
            case 'json':
                val = JSON.parse(val);
                break
            case 'number':
                val = val - 0;
                break
            default:
                break
        }
        $update[oper] = {};
        $update[oper][fieldname] = val

        this.collection.update(selector, $update, (e, r) => { //console.log('result', r.result)
            if (r.result.nModified == 1) {
                fn && fn(null, {
                    code: 0,
                    message: 'ok'
                })
            } else {
                fn && fn(null, {
                    code: 1,
                    message: e || 'can not find target'
                })
            }
        });
    }

    delfield(data, fieldname, fn) {
        var $update = {},
            val = data.body[fieldname] || data.body.value,
            fieldconf = this._getfieldconfig(fieldname),
            selector = {
                _id: this.ObjectID(data._id),

                _ds_id: data._ds_id
            };
        if (!fieldconf) {
            return fn && fn('can not find field ' + fieldname)
        }
        data.uid && (selector.uid = data.uid)
        switch (fieldconf.type) {
            case 'json':
                val = JSON.parse(val);
                break
            case 'array':
                $update.$pull = {};
                $update.$pull[fieldname] = val
                break
            default:
                $update.$set = {};
                $update.$set[fieldname] = null
                break
        }
        this.collection.update(selector, $update, (e, r) => {
            if (r && r.result && r.result.nModified == 1) {
                fn && fn(null, {
                    code: 0,
                    message: 'ok'
                })
            } else {
                fn && fn(null, {
                    code: 1,
                    message: 'can not find target'
                })
            }
        });
    }
    getfield(data, fieldname, fn) {
        var fieldconf = this._getfieldconfig(fieldname);
        if (!fieldconf) {
            return fn('can not find field ' + fieldname)
        }
        if (!data._id) {
            return fn('no _id')
        }
        var filter = {};
        filter[fieldname] = 1;

        this.collection.find({
            _id: this.ObjectID(data._id),
            _ds_id: data._ds_id
        }, filter).toArray((e, r) => {
            fn && fn(e, r && r[0] && r[0][fieldname]);
        });
    }


}
module.exports = ModelBase