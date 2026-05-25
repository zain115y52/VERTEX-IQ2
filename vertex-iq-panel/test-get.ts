process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
fetch("https://sbsj.zainfamily.uk:2053/PgZ6KTY/").then(r => console.log(r.status, r.headers)).catch(e=>console.log(e.message));
