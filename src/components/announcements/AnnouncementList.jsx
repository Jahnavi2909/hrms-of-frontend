import AnnouncementCard from "./AnnouncementCard";

const AnnouncementList = ({ announcements }) => {
  if (!announcements.length) {
    return <p className="text-muted">No announcements yet</p>;
  }

  return (
    <>
      {announcements.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} />
      ))}
    </>
  );
};

export default AnnouncementList;
