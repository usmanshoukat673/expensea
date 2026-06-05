import { notFound, redirect } from "next/navigation"
import { requireTeam } from "@/lib/auth/session"
import { getMemberWorkspaceData } from "@/lib/data/members"
import { MemberWorkspace } from "@/components/members/member-workspace"

export const metadata = { title: "Member Workspace" }

export default async function MemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const session = await requireTeam()

  try {
    const data = await getMemberWorkspaceData(session, memberId)
    return <MemberWorkspace data={data} />
  } catch (error) {
    if (String((error as Error).message).includes("own member workspace")) {
      redirect(`/members/${session.user.id}`)
    }
    notFound()
  }
}
