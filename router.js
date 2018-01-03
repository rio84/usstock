const Router=require('koa-router');
const router = new Router();


const index=require('./controller/index')

router.get('/', (ctx, next) => {
  // ctx.router available
  ctx.type='xml';
  ctx.body='<xm>2</xm>'
});
router.get('/index', index.index)
router.get('/list', (ctx, next) => {
    // ...
    ctx.type='xml';
    ctx.body='<xm>1</xm>'
})

module.exports=router