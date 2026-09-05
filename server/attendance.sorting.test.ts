import { describe, expect, it } from "vitest";
import {
  extractNameParts,
  sortAttendance,
  sortStudents,
  sortPublicAttendanceRecords,
} from "../shared/attendanceSorting";

describe("Alphabetical Last Name Attendance Sorting", () => {
  it("extracts last names correctly from varied formats including section codes", () => {
    expect(extractNameParts({ canonicalName: "Paloyo, Rose Marrie" })).toEqual({
      lastName: "Paloyo",
      firstName: "Rose",
      middleName: "Marrie",
    });

    expect(extractNameParts({ canonicalName: "OLCBTQM01_Ariola, Precious Mahalia D." })).toEqual({
      lastName: "Ariola",
      firstName: "Precious",
      middleName: "Mahalia D.",
    });

    expect(extractNameParts({ canonicalName: "John Paul Trinidad" })).toEqual({
      lastName: "Trinidad",
      firstName: "John Paul",
      middleName: "",
    });

    expect(extractNameParts({ canonicalName: "Albert Echin", lastName: "Echin", firstName: "Albert" })).toEqual({
      lastName: "Echin",
      firstName: "Albert",
      middleName: "",
    });
  });

  it("sorts public attendance records alphabetically by last name by default", () => {
    const recordsFromScreenshot = [
      { canonicalName: "Paloyo, Rose Marrie", status: "PRESENT" },
      { canonicalName: "Ariola, Precious Mahalia D.", status: "ABSENT" },
      { canonicalName: "Bacsal, Rica Mae B.", status: "PRESENT" },
      { canonicalName: "Reonisto, Via Bianca C.", status: "PRESENT" },
      { canonicalName: "Trinidad, John Paul", status: "PRESENT" },
      { canonicalName: "Raymundo, Franz Paul Rodney", status: "PRESENT" },
      { canonicalName: "Marquez, John Mark", status: "ABSENT" },
      { canonicalName: "Echin, Albert", status: "PRESENT" },
      { canonicalName: "Doble, Unis Bantes", status: "PRESENT" },
      { canonicalName: "Mendoza, Juliana A.", status: "PRESENT" },
    ];

    const sorted = sortPublicAttendanceRecords(recordsFromScreenshot, "last-name-asc");
    const sortedNames = sorted.map(r => r.canonicalName);

    expect(sortedNames).toEqual([
      "Ariola, Precious Mahalia D.",
      "Bacsal, Rica Mae B.",
      "Doble, Unis Bantes",
      "Echin, Albert",
      "Marquez, John Mark",
      "Mendoza, Juliana A.",
      "Paloyo, Rose Marrie",
      "Raymundo, Franz Paul Rodney",
      "Reonisto, Via Bianca C.",
      "Trinidad, John Paul",
    ]);
  });

  it("supports reverse last name (Z–A), first name (A–Z), and status sorting", () => {
    const records = [
      { canonicalName: "Bacsal, Rica Mae B.", status: "PRESENT" },
      { canonicalName: "Ariola, Precious Mahalia D.", status: "ABSENT" },
      { canonicalName: "Doble, Unis Bantes", status: "EXCUSED" },
    ];

    const reverseLastName = sortPublicAttendanceRecords(records, "last-name-desc");
    expect(reverseLastName.map(r => r.canonicalName)).toEqual([
      "Doble, Unis Bantes",
      "Bacsal, Rica Mae B.",
      "Ariola, Precious Mahalia D.",
    ]);

    const byFirstName = sortPublicAttendanceRecords(records, "first-name");
    expect(byFirstName.map(r => r.canonicalName)).toEqual([
      "Ariola, Precious Mahalia D.",
      "Bacsal, Rica Mae B.",
      "Doble, Unis Bantes",
    ]);

    const byStatus = sortPublicAttendanceRecords(records, "status");
    expect(byStatus.map(r => r.status)).toEqual([
      "ABSENT",
      "EXCUSED",
      "PRESENT",
    ]);
  });

  it("sorts secretary attendance records alphabetically by last name by default", () => {
    const attendance = [
      { canonicalName: "Trinidad, John Paul", status: "PRESENT" as const, hasScheduleConflict: false },
      { canonicalName: "Ariola, Precious Mahalia D.", status: "ABSENT" as const, hasScheduleConflict: false },
      { canonicalName: "Bacsal, Rica Mae B.", status: "PRESENT" as const, hasScheduleConflict: true },
    ];

    const sorted = sortAttendance(attendance, "last-name-asc");
    expect(sorted.map(r => r.canonicalName)).toEqual([
      "Ariola, Precious Mahalia D.",
      "Bacsal, Rica Mae B.",
      "Trinidad, John Paul",
    ]);
  });
});
