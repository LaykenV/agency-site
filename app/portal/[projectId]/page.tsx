type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  return (
    <div>
      <h1>Project {projectId}</h1>
    </div>
  );
}