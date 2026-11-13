import("./api/index.ts").then(m=>{console.log("IMPORT OK, handler:",typeof m.default);process.exit(0)}).catch(e=>{console.error("IMPORT FAILED:",e.code||"",e.message);process.exit(1)});
