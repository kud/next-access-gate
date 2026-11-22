import Link from "next/link"

export default function Home() {
  return (
    <main className="demo">
      <h1>Acme Orbit</h1>
      <p>Welcome to the private preview. Everything here sits behind the access gate.</p>
      <nav>
        <Link href="/deck?slide=1">Open the deck</Link>
        <form method="post" action="/access/logout">
          <button type="submit">Sign out</button>
        </form>
      </nav>
    </main>
  )
}
