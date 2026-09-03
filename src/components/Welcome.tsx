type WelcomeProps = {
  appName: string
}

export function Welcome({ appName }: WelcomeProps) {
  return (
    <section style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1>{appName}</h1>
      <p>Twelve months, thirteen festivals. One community, always something to gather around.</p>
      <p>The app is being set up. Requirements and features are coming soon.</p>
    </section>
  )
}
