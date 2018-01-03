"use strict";
const ModelBase = require('./Base');


const OPERATOR={
    EQ:'eq',

    NE:'ne',

    LT:'lt',
    LTE:'lte',
    GT:'gt',
    GTE:'gte',

    CONTAINS:'contains',
    IN:'in'
}
class StockAnalysisModel extends ModelBase {
    constructor() {
        var collectionName = 'stock_analysis',
            fields = [
                'symbol',
                {name: 'close', type: 'number'},
                {name: 'med', type: 'number'},
                {name: 'avg', type: 'number'},
                {name: 'lastDate', type: 'number'},
                {name:'MarketCapM',type:'number'}
            ];
        super(fields, collectionName)
    }

    
    async getlist(query, fn) {

        //var MarketCapM=((query.marketcap-0)/1000000)||8e4;
        /*
        var $match = {
            close: { $gt: 0 }
            //MarketCapM:{$gt:MarketCapM}
        }*/
        var selector={
            close: { $gt: 0 }
        },
        limit=10;

        for(var i=0;i<100;i++){
            var name=query['name'+i],
                operator=query['operator'+i],
                value=query['value'+i];
            if(!name){
                break
            }
            if(value){
                switch(operator){
                    case OPERATOR.EQ:
                        selector[name]=value;
                    break
                    case OPERATOR.NE:
                    case OPERATOR.LTE:
                    case OPERATOR.LT:
                    case OPERATOR.GTE:
                    case OPERATOR.GT:
                        selector[name]={};
                        selector[name]['$'+operator]=value
                      
                    break
                    case OPERATOR.CONTAINS:
                        selector[name]={
                            $regex:new RegExp(value),
                            $options:'i'
                        }
                    break
                    case OPERATOR.IN:
                        var in_arr=value.split(',');
                        selector[name]={
                            $in:in_arr
                        }
                        limit=Math.max(in_arr.length,limit)
                    break

                }
            }
        }
        //console.log('selector',selector);
        /*
        var symbols=query.symbol && query.symbol.split(',');
        if (symbols && symbols.length) {
            if(symbols.length==1){
                $match.symbol = new RegExp('^'+query.symbol.toUpperCase());
            }else{
                $match.symbol = {$in:symbols}

            }
            
        }else{//todo:symbol查询和全部list 查询还是要分开接口吧
            //return []
        }*/
        //console.log('selector',selector)
        var result= await this.collection.aggregate([
                {
                    $match: selector
                },
                {
                    $project: {
                        symbol: 1,
                        close: 1,
                        med: 1,
                        avg:1,
                        lastDate:1,
                        medLow: {
                            $divide: [{$subtract: ['$close', '$med']}, '$close']
                        }
                    }
                },

                {
                    $sort: {
                    //medLow: 1, 
                    symbol:1}
                },

                {
                    $limit: limit
                }
            ]).toArray();

        if(selector.symbol && selector.symbol.$in){//解决$in排序问题
            var arr=[];
            for(var i=0,symb;symb=selector.symbol.$in[i++];){//console.log(symb)
                for(var j=0,n;n=result[j++];){
                    if(n.symbol==symb){
                        arr.push(n);
                        break;
                    }
                }
            }
            return arr;
        }
        return result;


    }



}
module.exports = new StockAnalysisModel();



