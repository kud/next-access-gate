export default async function Deck(props: PageProps<"/deck">) {
  const { slide } = await props.searchParams
  return (
    <main className="demo">
      <h1>Launch deck</h1>
      <p>Slide {typeof slide === "string" ? slide : "1"} of 12: roadmap, pricing and the road to general availability.</p>
    </main>
  )
}
