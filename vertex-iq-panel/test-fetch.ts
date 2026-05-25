process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
fetch("https://expired.badssl.com").then(r => console.log("OK", r.status)).catch(e => console.log("ERR", e.message));
