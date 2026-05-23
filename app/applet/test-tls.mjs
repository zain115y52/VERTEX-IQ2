process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function run() {
  try {
    await fetch('https://expired.badssl.com/');
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
