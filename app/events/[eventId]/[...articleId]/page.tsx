import SelectArticleCard from "@/app/components/select-article-card";
import db from "@/db";
import { articleTable } from "@/db/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import SummarizedText from "@/app/components/summarized-text";

/**
 * Get articles Query
 * @param articleId - article id
 * @returns articles
 */
const getArticles = unstable_cache(
  async (articleId: string[]) => {
    return await db.query.articleTable.findMany({
      where: inArray(articleTable.id, articleId.map(Number)),
    });
  },
  ["articles"],
  {
    revalidate: 60,
  },
);

/**
 * Get other articles Query
 * @param eventId - event id
 * @param articleId - article id
 * @returns other articles
 */
const getOtherArticles = unstable_cache(
  async (eventId: string, articleId: string[]) => {
    return await db.query.articleTable.findMany({
      where: and(
        notInArray(articleTable.id, articleId.map(Number)),
        eq(articleTable.eventId, Number(eventId)),
      ),
    });
  },
  ["articles"],
  {
    revalidate: 60,
  },
);

/**
 * Article page
 * @param params - params
 * @returns Article page
 */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ eventId: string; articleId: string[] }>;
}) {
  const { eventId, articleId } = await params;

  const articlesPromise = getArticles(articleId);

  const otherArticlesPromise = getOtherArticles(eventId, articleId);

  const [articlesResult, otherArticlesResult] = await Promise.all([
    articlesPromise,
    otherArticlesPromise,
  ]);

  const articles = articlesResult;
  let otherArticles = otherArticlesResult;

  for (const article of articles) {
    if (typeof article.politicalGrade === "number") {
      if (article.politicalGrade > 0) {
        otherArticles = otherArticles.filter(
          (otherArticle) =>
            typeof otherArticle.politicalGrade === "number" &&
            otherArticle.politicalGrade <= 0,
        );
      }
      if (article.politicalGrade < 0) {
        otherArticles = otherArticles.filter(
          (otherArticle) =>
            typeof otherArticle.politicalGrade === "number" &&
            otherArticle.politicalGrade >= 0,
        );
      }
      if (article.politicalGrade === 0) {
        otherArticles = otherArticles.filter(
          (otherArticle) =>
            typeof otherArticle.politicalGrade === "number" &&
            otherArticle.politicalGrade !== 0,
        );
      }
    }
  }

  const thisArticle = articles[articleId.length - 1];
  return (
    <div className="w-full flex flex-col gap-2">
      <Image
        src={thisArticle?.image || "/default-article.png"}
        alt={thisArticle?.title || "Article Image"}
        width={600}
        height={400}
        className="w-full h-full object-cover max-w-2xl"
      />
      <div className="flex flex-col gap-2 p-4">
        <h1 className="text-2xl font-bold">{thisArticle?.title}</h1>
        <div className="flex items-center gap-2">
          <p>{thisArticle?.pressOrganization}</p>
          <p>{new Date(thisArticle?.createdAt).toLocaleDateString()}</p>
        </div>
        <p>{thisArticle?.journalist}</p>
      </div>
      <SummarizedText>{thisArticle?.summarized}</SummarizedText>
      <div className="p-4">
        {thisArticle?.content?.split("`").map((line, idx) => (
          <p key={idx}>
            {line}
            <br />
            <br />
          </p>
        ))}
      </div>
      {articleId.length === 1 && (
        <div>
          <SelectArticleCard
            articles={otherArticles}
            prevHref={`events/${eventId}/${thisArticle?.id}`}
          />
        </div>
      )}
      {articleId.length === 2 && (
        <div>
          <SelectArticleCard
            articles={otherArticles}
            prevHref={`events/${eventId}/${articleId[0]}/${thisArticle?.id}`}
          />
        </div>
      )}
      {otherArticles.length === 0 && (
        <div className="p-4 w-full flex justify-center">
          <Link
            href={`/analysis?articles=${articleId.join(",")}`}
            className="p-2 bg-neutral-900 rounded-md text-white text-center w-full"
          >
            Compare news articles
          </Link>
        </div>
      )}
    </div>
  );
}
