import { AccessGatePage } from "@kud/next-access-gate/page"
import { gate } from "../../access-gate"

export default function Page(props: PageProps<"/access">) {
  return (
    <AccessGatePage
      gate={gate}
      searchParams={props.searchParams}
      title="Acme Orbit, private preview"
      description="This demo is shared ahead of launch. Enter the access code from your invitation."
    />
  )
}
