

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
const { projectId } = await params;
  return (
    <div>
      <h1>Project {projectId}</h1>
    </div>
  );
}