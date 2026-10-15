import type { ReactNode } from 'react';

interface TableProps {
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}

export function Table({ caption, headers, rows }: Readonly<TableProps>) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col" className="text-wood-600 dark:text-wood-300 py-1 text-start font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-wood-100 dark:border-wood-800 border-b last:border-0">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="text-wood-700 dark:text-wood-200 py-1.5">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
