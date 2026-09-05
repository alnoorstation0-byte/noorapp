async function check() {
  const res = await fetch('http://localhost:3000/api/run-sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='accounts';" })
  });
  const data = await res.json();
  console.log(data);
}
check();
