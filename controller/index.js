const stockModel=require('../model/StockAnalysis')
module.exports={
	index:async (ctx,next)=>{
		//ctx.type='json'
		try{
			//console.log(ctx.query)
			var json=await stockModel.getlist(ctx.query)
			
			ctx.body= json;
		}catch(e){
			ctx.body= 'error'
		}
		
	}
}