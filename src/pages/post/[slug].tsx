/* eslint-disable no-param-reassign */
/* eslint-disable react/no-danger */
import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Head from 'next/head';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { useRouter } from 'next/router';
import { dateFormat } from '../../utils/dateFormat';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h2>Carregando...</h2>;
  }

  const formattedDate = dateFormat(new Date(post.first_publication_date));

  const totalWords = post.data.content.reduce((total, content) => {
    total += content.heading;
    total += RichText.asText(content.body);

    return total;
  }, '');

  const readAverage = Math.ceil(totalWords.split(' ').length / 200);

  return (
    <>
      <Head>
        <title>{`spacetraveling | ${post.data.title}`}</title>
      </Head>
      <Header />
      <img src={post.data.banner.url} alt="banner" className={styles.banner} />

      <main className={commonStyles.container}>
        <div className={styles.post}>
          <div>
            <h1>{post.data.title}</h1>
            <ul>
              <li>
                <FiCalendar />
                {formattedDate}
              </li>
              <li>
                <FiUser />
                {post.data.author}
              </li>
              <li>
                <FiClock />
                {`${readAverage} min`}
              </li>
            </ul>
          </div>

          {post.data.content.map(content => (
            <article key={content.heading}>
              <strong>{content.heading}</strong>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          ))}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;

  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 60, // 1 hour,
  };
};
