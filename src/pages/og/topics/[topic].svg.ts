import { getTopicDefinitions, type TopicEntry } from "../../../lib/content";
import { renderOgImage, topicAccent } from "../../../lib/og";

export async function getStaticPaths() {
  const topics = await getTopicDefinitions();
  return topics.map((topic) => ({ params: { topic: topic.id }, props: topic }));
}

export function GET({ props }: { props: TopicEntry }) {
  const topic = props;

  return new Response(
    renderOgImage({
      eyebrow: "Topic",
      title: topic.data.title,
      description: topic.data.description,
      accent: topicAccent(topic),
      meta: topic.data.keywords.slice(0, 3).join(" / "),
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
