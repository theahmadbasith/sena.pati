// pages/protokol.js — redirect ke halaman protokol statis
export default function Protokol() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/protokol/index.html',
      permanent: false
    }
  };
}
