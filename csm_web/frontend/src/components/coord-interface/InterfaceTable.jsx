//search bar (steal from goat alec)
import React from "react";
import { useParams } from "react-router-dom";

//import "../style/resources.css";
export default function Table({ resources }) {
  const [tableData, setTableData] = useState([]);
  const params = useParams();
  const courseId = Number(params.id);
  const { pathname } = useLocation();
  const isStudents = pathname.includes("students");

  useEffect(() => {
    const fetchData = async () => {
      const { tempTableData } = await fetchJSON(`/api/coord/${courseId}/${isStudents ? "students" : "mentors"} `);
      setTableData(tempTableData);
    };
    fetchData();
  }, []);

  return (
    <Table>
      if (isStudents) {} else {}
      {tableData.map(row => {
        if (isStudents) {
          <Link to={`/sections/${row.section}`}>
            <Tr>
              <Td>row.name</Td>
              <Td>row.email</Td>
              <Td>row.mentorName</Td>
              <Td>row.dayTime</Td>
              <Td>row.numUnexcused</Td>
            </Tr>
          </Link>;
        } else {
          <Link to={`/sections/${row.section}`}>
            <Tr>
              <Td>row.name</Td>
              <Td>row.email</Td>
              <Td>row.family</Td>
              <Td>row.dayTime</Td>
              <Td>row.numStudents</Td>
            </Tr>
          </Link>;
        }
        // <TRow week="" date="Date" worksheet="Worksheet" topic="Topics"/>
        // return (
        //     <div className={date === "Date" ? "title rowContainer" : "rowContainer"}>
        //         <div className="item"> Week {week}</div>
        //         <div className="item">{date}</div>
        //         <div className="item">{topic}</div>
        //         <div className="item">{worksheet}</div>
        //         <br></br>
        //     </div>
        // );
        // return <Row week={x.week} date={x.date} topic={x.topics} worksheet={x.worksheet}/>
      })}
    </Table>
  );
}
