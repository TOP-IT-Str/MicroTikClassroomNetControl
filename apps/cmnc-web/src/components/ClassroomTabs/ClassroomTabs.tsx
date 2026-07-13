import type { Classroom } from "../../api";
import { ClassroomStatisticsButton } from "../ClassroomStatisticsModal/ClassroomStatisticsModal";
import "./ClassroomTabs.css";


type ClassroomTabsProps = {
    classrooms: Classroom[];
    selectedClassroomId: number | null;
    onSelect: (classroomId: number) => void;
};


export function ClassroomTabs(props: ClassroomTabsProps) {
    const { classrooms, selectedClassroomId, onSelect } = props;
    const selectedClassroom = classrooms.find(
        (classroom) => classroom.id === selectedClassroomId,
    );

    return (
        <section className="classroom-tabs">
            {classrooms.map((classroom) => {
                const className = [
                    "tab",
                    classroom.id === selectedClassroomId ? "active-tab" : "",
                    classroom.is_service ? "service-tab" : "",
                ]
                    .filter(Boolean)
                    .join(" ");

                return (
                    <button
                        key={classroom.id}
                        className={className}
                        onClick={() => onSelect(classroom.id)}
                    >
                        {classroom.name}
                    </button>
                );
            })}
        </section>
    );
}
