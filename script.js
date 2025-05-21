// script.js - IFCLABS MVP - Versão Completa e Revisada

document.addEventListener('DOMContentLoaded', async () => {
    // --- Verificação de Token (Simulação) ---
    const authToken = sessionStorage.getItem('ifclabsAuthToken');
    const expectedTokenPrefix = "MVP_TOKEN_IFCLABS_";
    // Determina o caminho base do site para redirecionamentos corretos
    // No GitHub Pages, se o repositório é 'IFCLABS', o pathname começa com '/IFCLABS/'
    // Se for um domínio customizado na raiz, pathname não terá o nome do repo.
    const repoNameSegment = '/IFCLABS'; // Nome do seu repositório
    let siteRootPath = '';
    if (window.location.pathname.toLowerCase().startsWith(repoNameSegment.toLowerCase() + '/')) {
        siteRootPath = repoNameSegment;
    }

    const pathIsListaHtml = window.location.pathname.toLowerCase().endsWith('lista.html');

    if (pathIsListaHtml) {
        if (!authToken || !authToken.startsWith(expectedTokenPrefix)) {
            console.warn('Autenticação falhou ou token não encontrado. Redirecionando para login.');
            alert('Acesso não autorizado ou sessão expirada. Por favor, faça login.');
            window.location.replace(`${siteRootPath}/index.html`);
            return; // Impede a execução do restante do script
        }
        const loggedInUser = sessionStorage.getItem('ifclabsUser');
        if (loggedInUser) {
            console.log('Usuário logado (simulado):', loggedInUser);
            // A saudação e o botão de logout são tratados no script inline de lista.html
        }
    }
    // --- Fim da Verificação de Token ---

    // Executa o carregamento de dados apenas se estivermos na página lista.html
    if (pathIsListaHtml) {
        // Nomes das pastas dos seus projetos de exemplo.
        const projectFolderNames = ["Duto_Rigido_001"]; // Adicione mais se necessário

        window.projectsData = {}; // Objeto global para armazenar os dados dos projetos carregados
        window.currentProjectName = null; // Para saber qual projeto está ativo
        window.currentTabInfo = null;    // Para saber qual aba está ativa

        async function fetchProjectData(folderName) {
            try {
                // Caminho relativo à raiz do site.
                // Se script.js e Project_Samples estão na raiz do que é servido, isto é correto.
                const basePath = `./Project_Samples/${folderName}`;
                const noCache = `?v=${new Date().getTime()}`; // Para evitar cache durante testes

                const metadataUrl = `${basePath}/metadata.json${noCache}`;
                console.log("Tentando buscar metadata:", metadataUrl);
                const metadataResponse = await fetch(metadataUrl);
                if (!metadataResponse.ok) {
                    throw new Error(`Falha ao carregar metadata.json para ${folderName} (Status: ${metadataResponse.status}) URL: ${metadataResponse.url}`);
                }
                const metadata = await metadataResponse.json();
                console.log(`Metadata para ${folderName} carregado:`, metadata);

                const commentsUrl = `${basePath}/comments.json${noCache}`;
                console.log("Tentando buscar comments:", commentsUrl);
                const commentsResponse = await fetch(commentsUrl);
                if (!commentsResponse.ok) {
                    throw new Error(`Falha ao carregar comments.json para ${folderName} (Status: ${commentsResponse.status}) URL: ${commentsResponse.url}`);
                }
                const comments = await commentsResponse.json();
                console.log(`Comments para ${folderName} carregado:`, comments);

                const tabsData = {}; // Vai armazenar os dados CSV parseados (array de arrays)
                if (metadata.tabs && metadata.tabs.length > 0) {
                    for (const tabInfo of metadata.tabs) {
                        if (tabInfo.sourceFile) {
                            const csvUrl = `${basePath}/${tabInfo.sourceFile}${noCache}`;
                            console.log(`Tentando buscar CSV (${tabInfo.name}):`, csvUrl);
                            const csvResponse = await fetch(csvUrl);
                            if (!csvResponse.ok) {
                                throw new Error(`Falha ao carregar ${tabInfo.sourceFile} para ${folderName} (Status: ${csvResponse.status}) URL: ${csvResponse.url}`);
                            }
                            const csvText = await csvResponse.text();
                            tabsData[tabInfo.sourceFile] = parseCSV(csvText); // Parseia e armazena
                            console.log(`CSV ${tabInfo.sourceFile} para ${folderName} carregado e parseado.`);
                        } else {
                            console.warn(`Aba "${tabInfo.name}" no metadata de ${folderName} não tem sourceFile definido.`);
                            tabsData[tabInfo.sourceFile || tabInfo.name] = []; // Aba vazia
                        }
                    }
                }
                return { metadata, tabsData, comments }; // tabsData agora contém arrays de arrays
            } catch (error) {
                console.error(`Erro CRÍTICO ao carregar dados para o projeto ${folderName}:`, error);
                const projectListDiv = document.getElementById('project-list');
                if (projectListDiv) {
                    const errorItem = document.createElement('p');
                    errorItem.innerHTML = `Erro ao carregar <strong>${folderName}</strong>. Detalhes no console (F12).<br>URL tentada (exemplo): ${error.message.includes("URL:") ? error.message.substring(error.message.indexOf("URL:") + 5).trim() : "Verifique console para URL exata."}`;
                    errorItem.style.color = 'red';
                    projectListDiv.appendChild(errorItem);
                }
                return null;
            }
        }

        // Carrega todos os projetos
        for (const folderName of projectFolderNames) {
            const data = await fetchProjectData(folderName);
            if (data) {
                window.projectsData[folderName] = data;
            }
        }

        // Após carregar os dados, inicializa a interface
        const projectListDiv = document.getElementById('project-list');
        if (Object.keys(window.projectsData).length > 0) {
            if(projectListDiv) projectListDiv.innerHTML = ''; // Limpa "Carregando projetos..."
            listProjects();
            const docViewer = document.getElementById('document-viewer');
            if(docViewer) docViewer.style.display = 'none'; // Esconde inicialmente
        } else {
            if (projectListDiv) {
                if (!projectListDiv.querySelector('p[style*="color: red"]')) { // Só adiciona mensagem genérica se não houver erro específico
                    projectListDiv.innerHTML = "<p>Nenhum dado de projeto pôde ser carregado. Verifique o console (F12) para erros, os caminhos dos arquivos e se os arquivos de dados existem no repositório.</p>";
                }
            }
        }
    } // Fim do if (pathIsListaHtml)
});

function listProjects() {
    const projectListDiv = document.getElementById('project-list');
    if (!projectListDiv || !window.projectsData) {
        console.error("listProjects: Elemento project-list ou window.projectsData não encontrado.");
        return;
    }
    projectListDiv.innerHTML = ''; // Limpa antes de adicionar

    Object.keys(window.projectsData).forEach(projectName => {
        const projectButton = document.createElement('button');
        projectButton.textContent = projectName;
        projectButton.onclick = (event) => {
            document.querySelectorAll('#project-list button.active').forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            loadProject(projectName);
        }
        projectListDiv.appendChild(projectButton);
    });
}

function loadProject(projectName) {
    window.currentProjectName = projectName;
    const project = window.projectsData[projectName];

    if (!project || !project.metadata) {
        console.error("loadProject: Dados do projeto ou metadados não encontrados para:", projectName);
        // Limpar UI em caso de erro
        const docTitle = document.getElementById('document-title');
        if (docTitle) docTitle.textContent = `Erro ao carregar dados para ${projectName}.`;
        ['tab-buttons', 'data-table-container', 'doc-comments-list', 'save-button-container', 'tab-action-buttons-placeholder'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        return;
    }
    
    const docViewer = document.getElementById('document-viewer');
    if(docViewer) docViewer.style.display = 'block';

    const docTitle = document.getElementById('document-title');
    if(docTitle) docTitle.textContent = project.metadata.documentName || projectName;

    // Preencher metadados do documento
    document.getElementById('meta-created-by').textContent = project.metadata.createdBy || 'N/A';
    document.getElementById('meta-created-at').textContent = project.metadata.createdAt ? new Date(project.metadata.createdAt).toLocaleString('pt-BR') : 'N/A';
    document.getElementById('meta-last-modified-by').textContent = project.metadata.lastModifiedBy || 'N/A';
    document.getElementById('meta-last-modified-at').textContent = project.metadata.lastModifiedAt ? new Date(project.metadata.lastModifiedAt).toLocaleString('pt-BR') : 'N/A';

    const docCommentsList = document.getElementById('doc-comments-list');
    if(docCommentsList) {
        docCommentsList.innerHTML = '';
        if (project.metadata.documentComments && project.metadata.documentComments.length > 0) {
            project.metadata.documentComments.forEach(comment => {
                const listItem = document.createElement('li');
                listItem.textContent = `(${comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString('pt-BR') : 'N/A'}) ${comment.user}: ${comment.text}`;
                docCommentsList.appendChild(listItem);
            });
        } else {
            docCommentsList.innerHTML = '<li>Nenhum comentário geral para este documento.</li>';
        }
    }

    // Botão de Salvar/Download
    const saveButtonContainer = document.getElementById('save-button-container');
    if (saveButtonContainer) {
        saveButtonContainer.innerHTML = `<button id="save-changes-button">Baixar Arquivos Modificados</button>`;
        const saveBtn = document.getElementById('save-changes-button');
        if(saveBtn) saveBtn.onclick = downloadModifiedFiles;
    }

    const tabButtonsDiv = document.getElementById('tab-buttons');
    if(!tabButtonsDiv) return;
    tabButtonsDiv.innerHTML = '';

    // Limpar área de conteúdo da aba antes de carregar novas abas
    const currentTabNameEl = document.getElementById('current-tab-name');
    if(currentTabNameEl) currentTabNameEl.textContent = '';
    const dataTableContainer = document.getElementById('data-table-container');
    if(dataTableContainer) dataTableContainer.innerHTML = '';
     const tabActionButtonsPlaceholder = document.getElementById('tab-action-buttons-placeholder');
    if(tabActionButtonsPlaceholder) tabActionButtonsPlaceholder.innerHTML = '';


    if (project.metadata.tabs && project.metadata.tabs.length > 0) {
        project.metadata.tabs.forEach((tabInfo, index) => {
            const tabButton = document.createElement('button');
            tabButton.textContent = tabInfo.name;
            tabButton.dataset.tabFile = tabInfo.sourceFile; // Para referência

            tabButton.onclick = (event) => {
                document.querySelectorAll('#tab-buttons button.active').forEach(btn => btn.classList.remove('active'));
                event.currentTarget.classList.add('active');
                window.currentTabInfo = tabInfo;
                const tabDataArray = project.tabsData[tabInfo.sourceFile];
                loadTabData(projectName, tabInfo, tabDataArray, project.comments);
            }
            tabButtonsDiv.appendChild(tabButton);

            if (index === 0) { // Carrega a primeira aba por padrão
                tabButton.click(); // Simula o clique para executar toda a lógica de carregamento da aba
            }
        });
    } else {
        if(currentTabNameEl) currentTabNameEl.textContent = 'Nenhuma aba definida para este documento.';
    }
}

function parseCSV(csvString) {
    if (typeof csvString !== 'string') {
        console.warn("parseCSV: input is not a string, returning empty array.", csvString);
        return [];
    }
    const lines = csvString.trim().split(/\r?\n/); // Lida com \n e \r\n
    return lines.map(line => {
        // Parser CSV simples. Para casos complexos (vírgulas dentro de aspas, etc.),
        // seria necessária uma biblioteca ou um parser mais robusto.
        // Esta implementação assume que as vírgulas só aparecem como delimitadores.
        return line.split(',');
    });
}

function loadTabData(projectName, tabInfo, dataRows, projectCellComments) {
    console.log(`Carregando dados para aba: ${tabInfo.name}`, dataRows);
    const currentTabNameEl = document.getElementById('current-tab-name');
    if(currentTabNameEl) currentTabNameEl.textContent = `Dados da Aba: ${tabInfo.name}`;

    const dataTableContainer = document.getElementById('data-table-container');
    if(!dataTableContainer) return;
    dataTableContainer.innerHTML = ''; // Limpa conteúdo anterior (botões de ação + tabela)

    // Botões de Ação da Aba (ex: Adicionar Linha)
    const tabActionButtonsPlaceholder = document.getElementById('tab-action-buttons-placeholder');
    if (tabActionButtonsPlaceholder) {
        tabActionButtonsPlaceholder.innerHTML = ''; // Limpa botões de ação anteriores
        const addRowButton = document.createElement('button');
        addRowButton.textContent = 'Adicionar Linha';
        addRowButton.onclick = () => addRowToData(projectName, tabInfo.sourceFile);
        tabActionButtonsPlaceholder.appendChild(addRowButton);
    }


    if (!Array.isArray(dataRows)) {
        console.error("loadTabData: dataRows não é um array. Aba:", tabInfo.name, "Dados:", dataRows);
        dataTableContainer.innerHTML = `<p>Erro ao carregar dados para a aba "${tabInfo.name}". Formato de dados inesperado.</p>`;
        return;
    }

    const table = document.createElement('table');
    if (dataRows.length > 0) {
        // Cabeçalho da Tabela
        const headerRowEl = table.createTHead().insertRow();
        const columnHeaders = dataRows[0].map(headerText => String(headerText).trim()); // Linha 0 é o cabeçalho
        columnHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRowEl.appendChild(th);
        });
        // Adiciona uma coluna extra no cabeçalho para o botão de remover linha
        const thAction = document.createElement('th');
        thAction.textContent = "Ações";
        headerRowEl.appendChild(thAction);


        // Corpo da Tabela
        const tbody = table.createTBody();
        for (let i = 1; i < dataRows.length; i++) { // Começa em 1 para pular a linha de cabeçalho
            const currentRowData = dataRows[i];
            if (!Array.isArray(currentRowData) || currentRowData.join('').trim() === '') continue; // Pula linhas vazias ou inválidas

            const dataRowEl = tbody.insertRow();
            dataRowEl.dataset.rowIndexInModel = i; // Índice da linha no array de dados (incluindo cabeçalho)
            const rowId = currentRowData[0] ? String(currentRowData[0]).trim() : `generated-rowid-${i}`;

            currentRowData.forEach((cellText, cellIndex) => {
                const cell = dataRowEl.insertCell();
                cell.textContent = String(cellText == null ? "" : cellText).trim(); // Trata null/undefined
                cell.setAttribute('contenteditable', 'true');
                cell.dataset.columnIndexInModel = cellIndex;

                cell.addEventListener('blur', (event) => {
                    updateCellData(projectName, tabInfo.sourceFile, i, cellIndex, event.target.textContent);
                });

                // Lógica para destacar comentários
                if (projectCellComments && projectCellComments.length > 0 && cellIndex < columnHeaders.length) {
                    const columnHeader = columnHeaders[cellIndex];
                    if (tabInfo && tabInfo.id && rowId && columnHeader) {
                        const hasComment = projectCellComments.some(commentPoint =>
                            commentPoint.tabId === tabInfo.id &&
                            commentPoint.cellCoordinates.rowId === rowId &&
                            commentPoint.cellCoordinates.columnHeader === columnHeader
                        );
                        if (hasComment) {
                            cell.classList.add('has-comment');
                            let commentDetails = "Comentários:\n";
                            projectCellComments.filter(c =>
                                c.tabId === tabInfo.id &&
                                c.cellCoordinates.rowId === rowId &&
                                c.cellCoordinates.columnHeader === columnHeader
                            ).forEach(cPoint => {
                                if (cPoint.threads) {
                                    cPoint.threads.forEach(thread => {
                                        if (thread.entries) {
                                            thread.entries.forEach(entry => {
                                                commentDetails += `- ${entry.user} (${entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('pt-BR') : 'N/A'}): ${entry.commentText} [${entry.type}]\n`;
                                            });
                                        }
                                    });
                                }
                            });
                            cell.title = commentDetails;
                        }
                    }
                }
            });
            // Adicionar célula com botão de remover linha
            const actionCell = dataRowEl.insertCell();
            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.className = 'remove-row-button';
            removeButton.title = 'Remover esta linha';
            removeButton.onclick = () => removeRowFromData(projectName, tabInfo.sourceFile, i);
            actionCell.appendChild(removeButton);
        }
    } else {
        dataTableContainer.innerHTML += "<p>Nenhum dado para exibir nesta aba.</p>";
    }
    dataTableContainer.appendChild(table);
}

function updateCellData(projectName, sourceFile, rowIndexInModel, columnIndexInModel, newValue) {
    const project = window.projectsData[projectName];
    if (project && project.tabsData && project.tabsData[sourceFile] &&
        project.tabsData[sourceFile][rowIndexInModel] &&
        typeof project.tabsData[sourceFile][rowIndexInModel][columnIndexInModel] !== 'undefined') {

        project.tabsData[sourceFile][rowIndexInModel][columnIndexInModel] = newValue.trim();
        console.log(`Dado atualizado: Projeto ${projectName}, Aba ${sourceFile}, Linha (modelo) ${rowIndexInModel}, Coluna (modelo) ${columnIndexInModel}, Novo Valor: ${newValue.trim()}`);
        // Marcar que há alterações não salvas (para habilitar botão de download, por exemplo)
        // window.hasUnsavedChanges = true;
    } else {
        console.error("Erro ao tentar atualizar célula: caminho de dados inválido ou índice fora dos limites.", 
                      {projectName, sourceFile, rowIndexInModel, columnIndexInModel});
    }
}

function addRowToData(projectName, sourceFile) {
    const project = window.projectsData[projectName];
    if (project && project.tabsData && project.tabsData[sourceFile]) {
        const tabDataArray = project.tabsData[sourceFile]; // Este já é um array de arrays
        const numCols = tabDataArray.length > 0 ? tabDataArray[0].length : 1; // Baseado no cabeçalho
        
        const newRow = Array(numCols).fill('');
        newRow[0] = `uuid-row-${new Date().getTime()}`; // Novo _RowID único

        tabDataArray.push(newRow); // Adiciona ao array de dados em memória

        // Recarrega a aba atual para mostrar a nova linha
        if (window.currentTabInfo && window.currentTabInfo.sourceFile === sourceFile) {
            loadTabData(projectName, window.currentTabInfo, tabDataArray, project.comments);
        }
        console.log('Nova linha adicionada a:', sourceFile, newRow);
    } else {
        console.error("Não foi possível adicionar linha: dados da aba não encontrados.", {projectName, sourceFile});
    }
}

function removeRowFromData(projectName, sourceFile, rowIndexInModel) {
    const project = window.projectsData[projectName];
    if (project && project.tabsData && project.tabsData[sourceFile]) {
        const tabDataArray = project.tabsData[sourceFile];
        // rowIndexInModel é o índice no array de dados, que inclui o cabeçalho.
        // Não permitir remover a linha de cabeçalho (índice 0).
        if (rowIndexInModel > 0 && rowIndexInModel < tabDataArray.length) {
            const removedRow = tabDataArray.splice(rowIndexInModel, 1); // Remove a linha
            console.log('Linha removida de:', sourceFile, 'índice (modelo):', rowIndexInModel, 'Dados removidos:', removedRow);

            // Recarrega a aba atual
            if (window.currentTabInfo && window.currentTabInfo.sourceFile === sourceFile) {
                loadTabData(projectName, window.currentTabInfo, tabDataArray, project.comments);
            }
        } else {
            console.warn("Tentativa de remover linha de cabeçalho ou índice inválido:", rowIndexInModel);
        }
    } else {
         console.error("Não foi possível remover linha: dados da aba não encontrados.", {projectName, sourceFile});
    }
}

function convertArrayToCSV(dataArray) {
    if (!Array.isArray(dataArray)) {
        console.error("convertArrayToCSV: dataArray não é um array", dataArray);
        return "";
    }
    return dataArray.map(row => {
        if (!Array.isArray(row)) {
            console.warn("convertArrayToCSV: linha não é um array, será ignorada no CSV:", row);
            return ""; // Ou alguma representação de linha vazia, ex: ',,,'
        }
        return row.map(cell => {
            let cellString = String(cell == null ? "" : cell); // Trata null ou undefined como string vazia
            // Escapa aspas duplas e trata células com vírgulas, quebras de linha ou aspas
            if (/[",\r\n]/.test(cellString)) {
                cellString = '"' + cellString.replace(/"/g, '""') + '"';
            }
            return cellString;
        }).join(',');
    }).join('\r\n');
}

function downloadModifiedFiles() {
    if (!window.currentProjectName || !window.projectsData[window.currentProjectName]) {
        alert("Nenhum projeto carregado para salvar.");
        return;
    }
    const project = window.projectsData[window.currentProjectName];
    console.log("Preparando para download, projeto:", project);

    // 1. Download do metadata.json (assumindo que não é modificado no frontend neste MVP)
    // Se fosse modificado, você pegaria de window.projectsData[window.currentProjectName].metadata
    const metadataString = JSON.stringify(project.metadata, null, 2);
    downloadFile(metadataString, 'metadata.json', 'application/json;charset=utf-8;');

    // 2. Download dos CSVs das abas
    if (project.tabsData) {
        for (const sourceFile in project.tabsData) {
            const csvString = convertArrayToCSV(project.tabsData[sourceFile]);
            downloadFile(csvString, sourceFile, 'text/csv;charset=utf-8;');
        }
    } else {
        console.warn("Nenhum dado de aba (tabsData) para download.");
    }


    // 3. Download do comments.json (assumindo que não é modificado no frontend neste MVP)
    // Se fosse modificado, você pegaria de window.projectsData[window.currentProjectName].comments
    const commentsString = JSON.stringify(project.comments, null, 2);
    downloadFile(commentsString, 'comments.json', 'application/json;charset=utf-8;');

    alert("Arquivos preparados para download. Verifique a pasta de downloads do seu navegador.");
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a); // Adiciona ao DOM para garantir compatibilidade
    a.click();
    document.body.removeChild(a); // Limpa o elemento do DOM
    URL.revokeObjectURL(a.href); // Libera o objeto URL
    console.log(`Arquivo ${fileName} preparado para download.`);
}
