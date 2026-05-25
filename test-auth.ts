import 'dotenv/config'; // wait I will just fetch from localhost

async function fetchServers() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
     // we can't query api/admin/servers without auth token. 
  } catch(e) {}
}
