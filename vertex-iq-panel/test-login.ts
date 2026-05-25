process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
async function run() {
    try {
        const res = await fetch("https://sbsj.zainfamily.uk:2053/PgZ6KTY/login", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({username: "N", password: "1"})
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Headers:", res.headers.get("set-cookie"));
        console.log("Body:", text.slice(0, 200));
    } catch(e: any) {
        console.log("Error:", e.message);
    }
}
run();
