import { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, File, FolderOpen, ExternalLink, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClientContext } from '@/contexts/ClientContext';
import { useGoogleDriveFiles, DriveFile } from '@/hooks/useGoogleDriveFiles';

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="h-8 w-8 text-blue-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  if (mimeType.includes('pdf')) return <File className="h-8 w-8 text-red-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const getFileTypeName = (mimeType: string) => {
  if (mimeType.includes('document')) return 'Documento';
  if (mimeType.includes('spreadsheet')) return 'Planilha';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('presentation')) return 'Apresentação';
  return 'Arquivo';
};

export default function AdminFiles() {
  const { selectedClientId, selectedClient } = useClientContext();
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const clientId = selectedClientId !== 'all' ? selectedClientId : '';
  const { files, isLoading, error, fetchFiles, getFileContent } = useGoogleDriveFiles(clientId);

  useEffect(() => {
    if (clientId) fetchFiles();
  }, [clientId, fetchFiles]);

  const handlePreview = async (file: DriveFile) => {
    setPreviewFile(file);
    setLoadingPreview(true);
    const content = await getFileContent(file.id);
    setPreviewContent(content);
    setLoadingPreview(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Arquivos</h1>
        <p className="text-muted-foreground mt-1">Visualize os documentos do Google Drive dos clientes</p>
      </div>

      {!clientId ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Selecione um cliente</h3>
            <p className="text-sm text-muted-foreground">Use o seletor no topo da página para escolher um cliente</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : error ? (
        <Card className="border-destructive/50"><CardContent className="py-6"><p className="text-destructive text-center">{error}</p></CardContent></Card>
      ) : files.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Nenhum arquivo encontrado</h3>
            <p className="text-sm text-muted-foreground">O cliente não possui arquivos na pasta configurada</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">{files.length} arquivo{files.length !== 1 ? 's' : ''} encontrado{files.length !== 1 ? 's' : ''} em {selectedClient?.name}</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {files.map((file) => (
              <Card key={file.id} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {getFileIcon(file.mimeType)}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate" title={file.name}>{file.name}</CardTitle>
                      <CardDescription className="text-xs">{getFileTypeName(file.mimeType)}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {file.modifiedTime && <p className="text-xs text-muted-foreground mb-3">Modificado: {new Date(file.modifiedTime).toLocaleDateString('pt-BR')}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(file)}><Eye className="h-3 w-3 mr-1" />Ver</Button>
                    {file.webViewLink && <Button variant="outline" size="sm" onClick={() => window.open(file.webViewLink, '_blank')}><ExternalLink className="h-3 w-3" /></Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 pr-8">{previewFile && getFileIcon(previewFile.mimeType)}<span className="truncate">{previewFile?.name}</span></DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingPreview ? (<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>) : previewContent ? (<pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">{previewContent}</pre>) : (<p className="text-muted-foreground text-center py-12">Não foi possível carregar o conteúdo do arquivo</p>)}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
