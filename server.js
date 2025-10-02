const app = require('./src/app');
const port = Number(process.env.PORT||8080);
app.listen(port,()=>console.log('Task5 API on '+port));
