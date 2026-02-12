import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  searchable?: boolean;
  searchValue?: (row: T) => string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchPlaceholder?: string;
  maxHeight?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  maxHeight = '420px',
  emptyMessage = 'Nenhum dado encontrado',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        if (col.searchValue) return col.searchValue(row).toLowerCase().includes(q);
        if (col.searchable !== false) {
          const node = col.render(row);
          if (typeof node === 'string') return node.toLowerCase().includes(q);
        }
        return false;
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const handleSort = (key: string) => {
    const col = columns.find(c => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleResize = (key: string, startX: number, startWidth: number) => {
    const onMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      setColWidths(prev => ({ ...prev, [key]: Math.max(60, startWidth + diff) }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    const col = columns.find(c => c.key === colKey);
    if (!col?.sortValue) return null;
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative px-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <ScrollArea style={{ maxHeight }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'relative select-none whitespace-nowrap',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortValue && 'cursor-pointer hover:text-foreground transition-colors'
                    )}
                    style={colWidths[col.key] ? { width: colWidths[col.key], minWidth: colWidths[col.key] } : col.minWidth ? { minWidth: col.minWidth } : undefined}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </span>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const th = e.currentTarget.parentElement;
                        if (th) handleResize(col.key, e.clientX, th.getBoundingClientRect().width);
                      }}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((row, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-sm',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                        style={colWidths[col.key] ? { width: colWidths[col.key], minWidth: colWidths[col.key] } : undefined}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Row count */}
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground">
          {sorted.length} de {data.length} {data.length === 1 ? 'registro' : 'registros'}
        </p>
      </div>
    </div>
  );
}
