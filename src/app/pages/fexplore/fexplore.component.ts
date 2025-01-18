/* eslint-disable @typescript-eslint/consistent-type-assertions,@typescript-eslint/naming-convention */
import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
// import {HttpClient} from '@angular/common/http';
import {Subject, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {MenuItem, TreeNode} from 'primeng/api';
import {ConfirmationService} from 'primeng/api';
import {CommonService} from 'src/app/services/common.service';
import {FileIndexService} from 'src/app/services/file-index.service';
import {environment} from 'src/environments/environment';

// TODO: https://rxjs.dev/deprecations/subscribe-arguments

class Queue {
  elements: any[];
  head: number;
  tail: number;

  constructor() {
      this.elements = [];
      this.head = 0;
      this.tail = 0;
  }
  enqueue(element: any) {
    this.elements[this.tail] = element;
    this.tail++;
  }
  dequeue() {
    const item = this.elements[this.head];
    delete this.elements[this.head];
    this.head++;
    return item;
  }
  peek() {
    return this.elements[this.head];
  }
  get length() {
    return this.tail - this.head;
  }
  get isEmpty() {
    return this.length === 0;
  }
  
}

@Component({
  selector: 'app-fexplore',
  templateUrl: './fexplore.component.html',
  styleUrls: ['./fexplore.component.css']
})
export class FexploreComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('foldName') inpFoldName?: ElementRef = undefined;
  files: any[] = [];
  seldFile: string = '';
  folders: TreeNode[] = [];
  seldFolder: any = null;
  mItems: MenuItem[] = [];
  fmItems: MenuItem[] = [];
  dlgFolderVisible = false;
  dlgUploadVisible = false;
  dlgFolderHdr = 'Buat Folder Baru';
  dlgConfirmUpload = false;    // if true then for confirm upload
  folderName = '';
  folderNameClz = '';
  folderNameBlank = '';
  fileToUpload?: File = undefined;
  dlgLblName = 'Nama folder:';
  description?: string = undefined;
  filesPanelBlocked = false;
  fileUploadDisabled = false;
  // filesToUploads: File[] = [];
  private selectedFile: any;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  private folderIdxPath?: string;
  private anySubjSubsc?: Subscription;
  private fileMenuVisible = false;
  private fileClickEvent: any;
  private folderIdxId?: string;
  private inputFile?: HTMLInputElement;
  private userRights: any = {};
  private userId: string | null = null;
  private folderAccessRights = {
    viewFolder: 0,
    addFolder: 0,
    renameFolder: 0,
    deleteFolder: 0,
    addFile: 0,
    deleteFile: 0
  };
  private uploadQueue: Queue;
  private filesQueue: Queue;

  // TODO: create user management

  constructor(private filexService: FileIndexService, private service: CommonService,
              private router: Router, private confirmService: ConfirmationService) {
    this.uploadQueue = new Queue();
    this.filesQueue = new Queue();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initFolderIdxPath();
      // this.getUserAccessRights();
    });
  }

  ngOnInit(): void {
    this.userId = localStorage.getItem("gib");
    if (this.userId) {
      this.getUserAccessPermissions(this.userId);
    }
    console.log(`userId= ${this.userId}`);
    this.anySubjSubsc = this.service.getAnySubject()
        .pipe(takeUntil(this.destroy$)).subscribe(value => {
          if (value.cmd === 'test') {
            // this.testA(['jokowi'], 'gibran');
            this.testSearchByName();
          } else if (value.cmd === 'search') {
            this.search(value.txt);
          } else if (value.cmd === 'upload') {
            this.upload();
          } else if (value.cmd === 'open') {
            this.openFile();
          } else if (value.folderIdxId) {
            this.folderIdxId = value.folderIdxId;
            console.log(this.folderIdxId);
          }
        });
    /*  for testing only
        let i: number;
        for (i = 0; i < 50; i++) {
          this.files.push('src\\app\\pages\\fexplore\\fexplore.component.ts' + i.toString(10));
        }
    */
    // @ts-ignore
    // this.http.get('showcase/resources/data/files.json')
    //     .toPromise()
    //     .then(res => <TreeNode[]> res.json().data).then(files => this.folders = files);
    /*
        this.http.get<any>('assets/data/folders.json')
            .toPromise()
            .then(res => res.data)
            .then(data => {
              // this.folders = data;
              // console.log(data);
            }, err => {});

    this.http.get<any>('assets/data/folders.json').pipe(takeUntil(this.destroy$))
        .subscribe(res => {
          // console.log(res.data);
        });
    */

    this.mItems = [
      {
        label: 'Buat sub folder baru',  // satu level ke bawah
        icon: 'material-icons mi-create-new-folder', command: (/*event*/) => {
          if (!this.seldFolder/* || !this.seldFolder.children*/) {
            return;
          }
          this.folderName = '';
          this.dlgFolderHdr = 'Buat Sub Folder Baru';
          this.dlgLblName = 'Nama folder:';
          this.dlgConfirmUpload = false;
          this.dlgFolderVisible = true;
          setTimeout(() => {
            this.inpFoldName?.nativeElement.focus();
          });
        }
      },
      {
        // label: 'Buat folder baru pada level yang sama',  -> not required, temporarily
        label: 'Hapus folder',
        icon: 'material-icons mi-folder-delete', command: (/*event*/) => {
          // icon: 'material-icons mi-add-to-photos', command: (event) => {
          // this.addNewFolder(event, false);
          this.checkBeforeDeleteFolder();
        }
      },
      {
        label: 'Edit nama folder', icon: 'material-icons mi-edit', command: (/*event*/) => {
          if (this.seldFolder?.label === 'Documents') {
            return;
          }

          if (!this.folderAccessRights.renameFolder) {
            this.service.getMesgSubject().next({
              severity: 'error', summary: 'Rename folder failed',
              detail: 'You don\'t have permission'
            });
            return;
          }

          this.folderName = this.seldFolder.label;
          this.dlgFolderHdr = 'Edit Nama Folder';
          this.dlgConfirmUpload = false;
          this.dlgLblName = 'Nama folder:';
          this.dlgFolderVisible = true;
          setTimeout(() => {
            this.inpFoldName?.nativeElement.focus();
          });
        }
      }
    ];

    this.fmItems = [{
      label: 'Buka',
      icon: 'pi pi-eye',
      command: () => {
        this.openFile();
      }
    },
      {
        label: 'Hapus',
        icon: 'pi pi-trash',
        command: (/*event*/) => {
          if (!this.folderAccessRights.deleteFile) {
            this.service.getMesgSubject().next({
              severity: 'error', summary: 'Delete file failed',
              detail: 'You don\'t have permission'
            });
            return;
          }

          setTimeout(() => {
            this.confirmService.confirm({
              // target: event.originalEvent.target,
              target: this.fileClickEvent.target,
              message: 'PERHATIAN! File akan dihapus!',
              icon: 'pi pi-exclamation-triangle',
              acceptLabel: 'Hapus',
              rejectLabel: 'Batal',
              defaultFocus: 'reject',
              acceptIcon: 'pi pi-trash',
              accept: () => {
                this.deleteFile();
              },
              reject: () => {
                //reject action
              }
            });
          });
        }
      }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
    this.inputFile = undefined;
  }

  /*
    onMouseOver(ev, fileName) {
      this.seldFile = fileName;
    }
  */

  onNodeSelect(event: any) {
    console.log(event.node);    //event.node = selected node
    this.filesPanelBlocked = true;
    this.seldFolder = <TreeNode>event.node;

    if (this.seldFolder._id === '1') {
      this.files = [];
      this.seldFolder.children.forEach((a: any) => {
        this.files.push({
          name: a.label, class: 'pi pi-folder p-mr-2 mb-2',
          style: {cursor: 'pointer'}
        });
      });
      this.filesPanelBlocked = false;
      this.seldFile = '';
      return;
    }

    const rights = this.userRights[this.seldFolder._id];
    if (rights) {
      // eslint-disable-next-line no-bitwise
      if (!(rights & 1)) {
        this.seldFile = 'Hak akses terhadap folder ini tidak ada';
        this.files = [];
        this.filesPanelBlocked = false;
        return;
      }

      this.folderAccessRights = {
        viewFolder: rights & 1,
        addFolder: rights & 2,
        renameFolder: rights & 4,
        deleteFolder: rights & 8,
        addFile: rights & 16,
        deleteFile: rights & 32
      }

      let accessNotes = 'Access rights:  ';
      // eslint-disable-next-line no-bitwise
      if (rights & 1) {
        accessNotes += 'view folder, ';
        console.log('view folder');
      }
      if (rights & 2) {
        accessNotes += 'add folder, ';
        console.log('add folder');
      }
      // eslint-disable-next-line no-bitwise
      if (rights & 4) {
        accessNotes += 'rename folder, ';
        console.log('rename folder');
      }
      // eslint-disable-next-line no-bitwise
      if (rights & 8) {
        accessNotes += 'delete folder, ';
        console.log('delete folder');
      }
      // eslint-disable-next-line no-bitwise
      if (rights & 16) {
        accessNotes += 'add file, ';
        console.log('add file');
      }
      // eslint-disable-next-line no-bitwise
      if (rights & 32) {
        accessNotes += 'delete file, ';
        console.log('delete file');
      }

      this.getAllFiles();
      this.seldFile = accessNotes;
    } else {
      this.files = [];
      this.seldFile = 'Hak akses terhadap folder ini tidak ada';
      this.filesPanelBlocked = false;
    }
  }

  /*
    onNodeCtxMenuSelect(event) {
      //event.node = selected node
      // console.log(event.node);
      this.seldFolder = <TreeNode>event.node;

      if (this.seldFolder._id === '1') {
        this.files = [];
        this.seldFolder.children.forEach(a => {
          this.files.push({
            name: a.label, class: 'pi pi-folder p-mr-2 mb-2',
            style: {cursor: 'pointer'}
          });
        });
        return;
      }

      this.getAllFiles();
    }
  */

  uploadFile(ev: any) {
    // this.service.getBlockSubject().next(true);
    //event.files == files to upload
    if (!this.seldFolder || this.seldFolder._id === '1') {
      this.service.getMesgSubject().next({
        severity: 'warn', summary: 'Upload failed',
        detail: 'Sub folder must be selected first'
      });
      ev.files.length = 0;
      this.dlgUploadVisible = false;
      this.fileUploadDisabled = false;
      return;
    }

    this.filesPanelBlocked = true;
    let indexName = this.seldFolder._id.toLowerCase();
    if (indexName.startsWith('_')) {
      indexName = 'x' + indexName;
    }
    const body = {
      method: 1,
      indexName
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      this.filesPanelBlocked = false;
      if (res[indexName]) {
        // console.log(res[indexName].settings.index.uuid);
        for (let i = 0; i < ev.files.length; i++) {
          // const file = Object.assign({}, ev.files[i]);
          // this.addFileToFolder(ev.files[i], res[indexName].settings.index.uuid);
          const fileName = ev.files[i].name;
          let j = 0;
          let found = false;
          while (j < this.files.length && !found) {
            found = this.files[j++].name === fileName;
          }

          if (found) {
            this.service.getMesgSubject().next({
              severity: 'warn', summary: 'Upload failed',
              detail: `File ${fileName} already exists`
            });
            continue;
          }

          ev.files[i].uuid = res[indexName].settings.index.uuid;
          this.filesQueue.enqueue(ev.files[i]);
        }

        this.folderName = this.filesQueue.peek().name;
        this.setDlgFolderMode(true);
        setTimeout(() => this.dlgFolderVisible = true);
      }
    }, error => {
      this.filesPanelBlocked = false;
      this.createFileIndex(indexName, ev.files);
    })
  }

  /*
    onSelectFileUpload(ev) {
      if (ev.currentFiles.length > 0) {
        console.log(this.filesToUploads);
        console.log(ev.currentFiles[0]);
      }
    }
  */

  onClickUpload(fileIn: HTMLInputElement) {
    if (!this.inputFile) {
      this.inputFile = fileIn;
    }
    // @ts-ignore
    if (fileIn.files.length > 0) {
      console.log(fileIn.files);
      // this.service.getBlockSubject().next(true);
      setTimeout(() => {
        this.uploadFile({files: fileIn.files});
      })
      this.dlgUploadVisible = false;
    }
  }

  onOkDlgFolder(/*ev, field*/) {
    // console.log(ev);
    // console.log(field);
    this.folderName = this.folderName.trim();
    if (this.folderName.length === 0) {
      this.folderNameBlank = 'Nama folder harus diisi';
      this.folderNameClz = 'ng-invalid ng-dirty';
      return;
    }

    this.dlgFolderVisible = false;
    if (this.dlgConfirmUpload && !this.filesQueue.isEmpty) {
      setTimeout(() => {
        // this.addFileToFolder(,)
        this.onDropFile(null);
      }, 500);

      return;
    }

/*
    if (this.dlgConfirmUpload) {
      let i = 0;
      let found = false;
      while (i < this.files.length && !found) {
        found = this.files[i++].name === this.fileToUpload?.name;
      }

      if (found) {
        this.service.getMesgSubject().next({
          severity: 'error', summary: 'Upload failed',
          detail: 'File already exists'
        });
        return;
      }
      // this.uploadFiles.push(event.dataTransfer.files[0]);
      // this.addFileToFolder(event.dataTransfer.files, '');
      const ev = {
        files: [this.fileToUpload]
      };
      this.service.getBlockSubject().next(true);
      setTimeout(() => {
        this.uploadFile(ev);
      })
      return;
    }
*/

    if (this.folderNameExist()) {
      this.service.getMesgSubject().next({
        severity: 'error', summary: 'Action failed',
        detail: 'Name already exists'
      });
      return;
    }

    setTimeout(() => {
      if (this.dlgFolderHdr.startsWith('Buat')) {
        this.seldFolder = this.addNewFolder(this.folderName);
        this.addNewFolderToIdx();
      } else {
        this.getFolderInfo(() => this.renameFolder());
        /*
                var reqBody = new
                {
                  _id = dlg.Data._id,
                  _index = dlg.Data._index,
                  doc = body,
                  filesDel = delFiles,
                  files = pathDict
                };
                var result = await es.GetResult("/ixlet?mit=" + mtidt, JObject.FromObject(reqBody), "PUT");
        */
      }
    });
    // this.createFolderIndex();      // called only once
  }

  onDropFile(event: any | null) {
    if (event != null) {
      event.preventDefault();
    }
    this.setDlgFolderMode(true);
    if (event != null) {
      this.fileToUpload = event.dataTransfer.files[0];
      this.folderName = event.dataTransfer.files[0].name;
    } else {
      const file = this.filesQueue.dequeue();
      // this.fileToUpload = file;
      this.addFileToFolder(file, file.uuid);
      console.log(file.uuid);
      if (this.filesQueue.isEmpty) {
        return;
      } else {
        this.folderName = this.filesQueue.peek().name;
        let i = 0;
        let found = false;
        while (i < this.files.length && !found) {
          found = this.files[i++].name === this.folderName;
        }

        if (found) {
          this.service.getMesgSubject().next({
            severity: 'warn', summary: 'Upload failed',
            detail: `File ${this.folderName} already exists`
          });
        }
      }
    }
    this.description = undefined;
    this.setDlgFolderMode(true);
    this.dlgFolderVisible = true;
  }

  private setDlgFolderMode(uploadMode: boolean) {
    this.dlgFolderHdr = 'Konfirmasi Upload';
    this.dlgLblName = 'File:';
    this.dlgConfirmUpload = uploadMode;
  }

  onClickFile(ev: any, file: any, menu: any) {
    ev.preventDefault();
    if (ev.button === 2) {
      if (this.fileMenuVisible) {
        menu.hide();
      } else {
        this.fileMenuVisible = true;
        this.fileClickEvent = ev;
        menu.show(ev);
      }
    } else {
      menu.hide();
    }

    if (this.selectedFile) {
      this.selectedFile.style = {cursor: 'pointer'};
    }
    file.style = {cursor: 'pointer', 'background-color': 'antiquewhite'};
    this.seldFile = file.name;
    this.selectedFile = file;
  }

  onHideFileMenu() {
    this.fileMenuVisible = false;
  }

  /*
    dragFileEnter(event) {
      event.preventDefault();
      // console.log('event');
    }
  */

  private initFolderIdxPath() {
    this.service.getBlockSubject().next(true);
    const body = {
      method: 1,
      indexName: 'docsfolders'
    };
    const {mit} = CommonService.getCurrentTimeStr();

    // this.service.httpGet(/*this.folderName*/'docsfolders', environment.urlAdil)
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      this.folderIdxPath = res.docsfolders.settings.index.uuid;
      this.createFoldersTree(/*'6sPPI4gBg-QswwLuUy3N'*/this.folderIdxId);
    }, () => {
      this.showErrorMsg(mit, 'Folders index cannot be retrieved');
    })
  }

  private folderNameExist() {
    let found = false;
    for (const folder of this.seldFolder.children) {
      // noinspection JSUnfilteredForInLoop
      if (folder._id !== '0'
          && folder.label.toLowerCase() === this.folderName.toLowerCase()) {
        found = true;
        break;
      }
    }
    return found;
  }

  private addNewFolderToIdx() {
    this.service.getBlockSubject().next(true);

    let parent = this.seldFolder.parent;
    let path = '';
    while (parent) {
      if (path.length === 0) {
        path = parent.label + path;
      } else {
        path = parent.label + ' > ' + path;
      }
      parent = parent.parent;
    }

    const {waktuStr, mit} = CommonService.getCurrentTimeStr();
    const body = {
      arsipName: 'docsfolders',
      _parent_id: this.seldFolder.parent._id,
      createTime: waktuStr,
      label: this.seldFolder.label,
      name: this.seldFolder.label.replace(' ', '_').toLowerCase(),
      fpath: path,
      files: {},
      srtTitle: this.seldFolder.label,
      indexPath: this.folderIdxPath
    };

    this.service.httpPost(`ixlet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        /*
          console.log(data);
          {
            "_index": "docsfolders",
              "_id": "d73bG4cBBelXRrclE71Z",
              "_version": 1,
              "result": "created",
              "_shards": {
            "total": 2,
                "successful": 1,
                "failed": 0
          },
            "_seq_no": 0,
              "_primary_term": 2
          }
        */
        this.seldFolder._id = data._id;
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'success', summary: 'Buat Folder Sukses',
          detail: `Folder ${this.folderName} telah dibuat`
        });
        if (this.userId) {    // TODO: Test this
          this.addUserRightsOnFolder(this.userId, data._id,
              1 + 2 + 4 + 8 + 16 + 32);
        }
      }, // success path
      error: (/*error*/) => {
        this.showErrorMsg(mit, 'Folder cannot be added');
      }
    }); // error path
  }

  private showErrorMsg(mit: string, summary: string, action: any = null) {
    this.service.httpGet(`excevlet?mit=${mit}`)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        if (res.mesg?.toString().startsWith('no such index')) {
          if (res.mesg.toString().endsWith('[docsfolders]')) {
            this.createFolderIndex();
            return;
          } else if (res.mesg.toString().endsWith('[users]')) {
            this.createUserIndex();
            return;
          } else {
            this.files = [];
            if (action) {
              action();
              return;
            }
          }
        }
        console.log(res);
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'error', summary, detail: res.mesg
        });
      }, error: err => {
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'error', summary, detail: err
        });
      }, complete: () => {
        this.service.getBlockSubject().next(false);
      }
    });
  }

  private renameFolder() {
    console.log(`renameFolder = ${this.folderName}`);
    this.service.getBlockSubject().next(true);
    const oldFpath = this.seldFolder.data.fpath + ' > ' + this.seldFolder.data.label;
    this.seldFolder.data.label = this.folderName;
    this.seldFolder.data.srtTitle = this.seldFolder.data.label;
    this.seldFolder.label = this.seldFolder.data.label;
    this.seldFolder.data.name = this.seldFolder.label.replace(' ', '_').toLowerCase();
    const newFpath = this.seldFolder.data.fpath + ' > ' + this.seldFolder.data.label;

    const par = {
      script: {
        source: `ctx._source.fpath = \'${newFpath}\'`,
        lang: 'painless'
      },
      query: {
        bool: {
          filter: [
            // {term: {_id: 'fb2HK4cBBelXRrclnL21'}}
            {term: {'fpath.keyword': oldFpath}}
          ]
        }
      }
      /*
            query: {
              match_phrase: {
                fpath: oldFpath
              }
            }
      */
      /*
            properties: {   // use put method to update /_mapping
              fpath: {
                type: 'text',
                fields: {
                  keyword: {
                    type: 'keyword'
                  }
                },
                analyzer: 'breadcrumb',
                store: true
              }
            }
      */
    }

    const body = {
      method: 2,
      indexName: 'docsfolders',
      path: '_update_by_query',
      body: JSON.stringify(par)
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      console.log(res);
      /*
            {
              "took": 313,
                "timed_out": false,
                "total": 1,
                "updated": 1,
                "deleted": 0,
                "batches": 1,
                "version_conflicts": 0,
                "noops": 0,
                "retries": {
              "bulk": 0,
                  "search": 0
            },
              "throttled_millis": 0,
                "requests_per_second": -1,
                "throttled_until_millis": 0,
                "failures": []
            }
      */
      this.sendFolderNewName();
    }, () => {
      this.showErrorMsg(mit, 'Folder rename failed');
    })
  }

  private getFolderInfo(method: any) {
    const reqBody = {
      query: {
        term: {
          _id: this.seldFolder._id
        }
      }
    }
    const body = {
      method: 2,
      indexName: 'docsfolders',
      path: '_search',
      body: JSON.stringify(reqBody)
    };
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      console.log(res);
      if (res.hits?.hits?.length > 0) {
        this.seldFolder.data = res.hits.hits[0]._source;
        method();
      }
    }, () => {
      this.showErrorMsg(mit, 'Folder retrieve failed');
    })
  }

  private sendFolderNewName() {
    this.service.getBlockSubject().next(true);
    const newLabel = this.seldFolder.data.label;
    const parBody = {
      script: {
        source: `ctx._source.label = \'${newLabel}\'; `
            + `ctx._source.name = \'${newLabel.replace(' ', '_').toLowerCase()}\'; `
            + `ctx._source.srtTitle = \'${newLabel}\'`,
        // source: `ctx._source.fpath = \'${newPath}\'; ctx._source.label = \\'${newPath}\\'`,
        /*
                params:{
                  fpath: 'new fpath',
                  label: 'new label'
                },
        */
        lang: 'painless'
      },
      query: {
        term: {
          _id: this.seldFolder._id
        }
      }
    }

    const body = {
      method: 2,
      indexName: 'docsfolders',
      path: '_update_by_query',
      body: JSON.stringify(parBody)
    };
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      console.log(res);
      this.service.getBlockSubject().next(false);
      this.service.getMesgSubject().next({
        severity: 'success', summary: 'Sukses',
        detail: 'Nama folder telah dirubah'
      });
    }, () => {
      this.showErrorMsg(mit, 'Folder rename failed');
    })
  }

  // noinspection DuplicatedCode
  private createFolderIndex() {
    const body = {
      method: 4,
      indexName: 'docsfolders',
      body: JSON.stringify(this.filexService.createFolderIndexBody())
    };
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      console.log(res);
      this.initFolderIdxPath();
    }, () => {
      this.showErrorMsg(mit, 'Create folder index failed');
    })
  }

  private addNewFolder(label: string, child = true): any {
    let parent = this.seldFolder.parent;
    if (child) {
      parent = this.seldFolder;
    }

    const newNode = {
      data: 'node data',
      expandedIcon: 'pi pi-folder-open',
      collapsedIcon: 'pi pi-folder',
      _id: '0', parentId: parent._id,
      label,
      parent,
      children: <any>[]
    } as TreeNode;

    parent.children.push(newNode);
    parent.expanded = true;
    // this.seldFolder = null;
    // const tree = this.folders;
    // this.folders = null;
    /*
    {
    }
        setTimeout(() => {
          // this.folders = [...tree];
          this.seldFolder = newNode;
        });
    */

    return newNode;
  }

  private createFoldersTree(seldId?: string) {
    console.log('createFoldersTree');
    this.seldFolder = null;
    this.selectedFile = null;
    this.seldFile = 'Drop your file here';
    this.files = <any>[];
    this.folders = [];
    const reqBody = {
      sort: [
        {createTime: {order: 'asc'/*, "format": "strict_date_optional_time_nanos"*/}},
      ],
      query: {
        match_all: {}
      }
    };
    const body = {
      method: 2,
      indexName: 'docsfolders',
      path: '_search',
      body: JSON.stringify(reqBody)
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        // this.service.httpPost(`docsfolders/_search`, body)
        .pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
          console.log(data.hits);
          /*
            {
              "total": {
              "value": 1,
                  "relation": "eq"
              },
              "max_score": 1,
              "hits": [
                {
                  "_index": "docsfolders",
                  "_id": "d73bG4cBBelXRrclE71Z",
                  "_score": 1,
                  "_source": {
                    "_parent_id": 1,
                    "createTime": "2023-03-26T02:59:14.301Z",
                    "label": "Olahraga",
                    "name": "olahraga",
                    "fpath": "Documents",
                    "srtTitle": "Olahraga",
                    "folderIdxPath": "2UxidaYaTHiv9bdhUwP51Q"
                  }
                }
              ]
            }
          */
          const nodes = [
            {
              _id: '1', parentId: null, label: 'Documents', data: '',
              expandedIcon: 'pi pi-folder-open', collapsedIcon: 'pi pi-folder'
            },
            // {_id: '2', parentId: 1, label: 'Work'},
            // {_id: '3', parentId: 1, label: 'Home'},
            // {_id: '4', parentId: 2, label: 'Expenses.doc'},
            // {_id: '5', parentId: 2, label: 'Resume.doc'},
            // {_id: '6', parentId: 3, label: 'Invoices.txt'},
          ];
          let seldNode: any = null;
          data.hits.hits.forEach((elmt: any) => {
            const node = {
              _id: elmt._id,
              parentId: elmt._source._parent_id.toString(),
              label: elmt._source.label,
              data: elmt._source,
              expandedIcon: 'pi pi-folder-open',
              collapsedIcon: 'pi pi-folder'
            };
            nodes.push(node);
            if (seldId && seldId === elmt._id) {
              seldNode = node;
            }
          });
          /*
                    let i: number;
                    for (i = 0; i < nodes.length; i++) {
                      nodes[i] = Object.assign({
                        data: 'node data',
                        expandedIcon: 'pi pi-folder-open',
                        collapsedIcon: 'pi pi-folder'
                      }, nodes[i]);
                    }
          */
          // @ts-ignore
          this.folders = this.filexService.buildTree(nodes);
          this.service.getBlockSubject().next(false);
          setTimeout(() => {
            if (seldNode) {
              this.seldFolder = seldNode;
              while (seldNode.parent) {
                seldNode = seldNode.parent;
                seldNode.expanded = true;
              }
              this.getAllFiles();
            }
          });
        }, // success path
        () => {
          this.showErrorMsg(mit, 'Folder tree cannot be created');
        }); // error path
  }

  private addFileToFolder(newFile: any, indexPath: string) {
    let parent = this.seldFolder.parent;
    if (!parent) {
      return;
    }

    let path = this.seldFolder._id;
    while (parent._id !== '1') {
      path = parent._id + '/' + path;
      parent = parent.parent;
    }

    const fileIcon = {
      name: newFile.name, class: 'pi pi-spin pi-spinner p-mr-2 mb-2',
      style: {cursor: 'pointer'}, fa_path1: 'body.files.fa_path1',
      _id: 'data._id', _index: 'data._index'
    };
    this.files.push(fileIcon);
    this.uploadQueue.enqueue(fileIcon);

/*  // for debug & simulation only
    setTimeout(() => {
      const file = this.uploadQueue.dequeue();
      // file.fa_path1 = body.files.fa_path1;
      // file._id = data._id;
      // file._index = data._index;

      if (newFile.name.endsWith('.pdf')) {
        file.class = 'pi pi-file-pdf p-mr-2 mb-2';
      } else {
        file.class = 'pi pi-file p-mr-2 mb-2';
      }
      this.service.getBlockSubject().next(false);
      this.service.getMesgSubject().next({
        severity: 'success', summary: 'Upload File Sukses',
        detail: `File ${newFile.name} Telah Diupload`
      });
      console.log(this.filesQueue.length);
    }, 10000);
    return;
*/

    const {mit} = CommonService.getCurrentTimeStr();
    // console.log(newFile);
    // console.log(path);

    const formData = new FormData();
    formData.append('p', path);   // _idL1 / _idL2 / _idLN
    formData.append('n', this.seldFolder.data.name);
    formData.append('file', newFile, newFile.name);

    this.service.httpPost(`filup?mit=${mit}`, formData, false,
        {'Content-Type': 'multipart-form-data'}, undefined, environment.urlAdil)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        console.log(res);    // file's full path
        if (res) {
          this.indexFile(indexPath, newFile.name, res.path);
            //ERROR TypeError: Cannot read properties of undefined (reading 'name')
        } else {
          this.service.getBlockSubject().next(false);
        }
      },
      error: (/*error*/) => {
        this.uploadQueue.dequeue();
        this.showErrorMsg(mit, `File ${newFile.name} cannot be upload`);
      }
    });
  }
/*
  private testA(files: any[], indexPath: string) {
      // this.service.getBlockSubject().next(true);
    // this.filesPanelBlocked = true;

    let parent = this.seldFolder.parent;
    if (!parent) {
      return;
    }

    let path = this.seldFolder._id;
    while (parent._id !== '1') {
      path = parent._id + '/' + path;
      parent = parent.parent;
    }

    const i = this.uploadQueue.length + 1;
    const file = {
      name: `File Logistik ${i}.pdf`, class: 'pi pi-spin pi-spinner p-mr-2 mb-2',
      style: {cursor: 'pointer'}, fa_path1: 'body.files.fa_path1',
      _id: 'data._id', _index: 'data._index'
    };
    this.files.push(file);
    this.uploadQueue.enqueue(file);

    const {mit} = CommonService.getCurrentTimeStr();
    console.log(files[0]);
    console.log(path);

    const formData = new FormData();
    formData.append('p', path);   // _idL1 / _idL2 / _idLN
    formData.append('n', this.seldFolder.data.name);
    // formData.append('file', files[0], files[0].name);
    this.service.httpPost(`filup?mit=${mit}&tm=3`, formData, false,
        {'Content-Type': 'multipart-form-data'}, undefined, environment.urlAdil)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        // console.log(res);    // file's full path
        if (res) {
          // this.filesPanelBlocked = false;

          this.testB(files, indexPath);
        } else {
          this.service.getBlockSubject().next(false);
          this.filesPanelBlocked = false;
        }
      },
      error: (/ * error * /) => {
        this.showErrorMsg(mit, 'File cannot be upload');
        this.filesPanelBlocked = false;
      }
    });
  }

  private testB(files: any[], indexPath: string) {
    // this.service.getBlockSubject().next(true);
    let parent = this.seldFolder.parent;
    if (!parent) {
      return;
    }

    let path = this.seldFolder._id;
    while (parent._id !== '1') {
      path = parent._id + '/' + path;
      parent = parent.parent;
    }

    const {mit} = CommonService.getCurrentTimeStr();
    console.log(files[0]);
    console.log(path);

    const formData = new FormData();
    formData.append('p', path);   // _idL1 / _idL2 / _idLN
    formData.append('n', this.seldFolder.data.name);
    // formData.append('file', files[0], files[0].name);
    this.service.httpPost(`filup?mit=${mit}`, formData, false,
        {'Content-Type': 'multipart-form-data'}, undefined, environment.urlAdil)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        // console.log(res);    // file's full path
        if (res) {
          const file = this.uploadQueue.dequeue();
          file.class = 'pi pi-file-pdf p-mr-2 mb-2';

          this.service.getBlockSubject().next(false);
          this.service.getMesgSubject().next({
            severity: 'success', summary: `Upload File Sukses`,
            detail: `File ${file.name} Telah Diupload`
          });
        }
      },
      error: (/ * error * /) => {
        this.showErrorMsg(mit, 'File cannot be upload');
      }
    });
  } 
*/
  private indexFile(indexPath: string, name: string, serverPath: string) {
    const {waktuStr, mit} = CommonService.getCurrentTimeStr();
    // TODO: display loading async
    let indexName = this.seldFolder._id.toLowerCase();
    if (indexName.startsWith('_')) {
      indexName = 'x' + indexName;
    }

    let waktuUpload = waktuStr.substring(8, 10) + '-';
    waktuUpload += waktuStr.substring(5, 7) + '-';
    waktuUpload += waktuStr.substring(0, 4) + ' ';
    waktuUpload += waktuStr.substring(11, 16);

    let body = {
      arsipName: indexName,
      _parent_id: this.seldFolder._id,
      createTime: waktuStr,
      name,
      files: {fa_path1: name + '|' + serverPath},
      srtTitle: name + ', Waktu upload: ' + waktuUpload,
      indexPath,
      inxdFields: ['name', 'fa_content1']
    };

    if (this.description && this.description?.trim().length > 0) {
      body = Object.assign(body, {description: this.description});
    }

    // noinspection DuplicatedCode
    this.service.httpPost(`ixlet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
          /*
                    console.log(data);
                    {
                      _index: '"'fb2hk4cbbelxrrclnl21',
                        _id: '"'cQCuT4cBJWfXdJEoBnBj',
                        _version: '1',
                        result: '"'created',
                        _shards: '{'
                      total: '2',
                          successful: '1',
                          failed: '0'
                    },
                      _seq_no: '3',
                        _primary_term: '5'
                    }
          */

          const file = this.uploadQueue.dequeue();
          file.fa_path1 = body.files.fa_path1;
          file._id = data._id;
          file._index = data._index;

          if (name.endsWith('.pdf')) {
            file.class = 'pi pi-file-pdf p-mr-2 mb-2';
          } else {
            file.class = 'pi pi-file p-mr-2 mb-2';
          }
          this.service.getBlockSubject().next(false);
          this.service.getMesgSubject().next({
            severity: 'success', summary: 'Upload File Sukses',
            detail: `File ${name} Telah Diupload`
          });
        }, // success path
        (/*error*/) => {
          this.uploadQueue.dequeue();
          this.service.getBlockSubject().next(false);
          this.showErrorMsg(mit, 'Folder cannot be added');
        }); // error path
  }

  private createFileIndex(indexName: string, files: any[]) {
    const reqBody = this.filexService.createFileIndexBody();
    let body = {
      method: 4,
      indexName
    };
    body = Object.assign(body, {
      body: JSON.stringify(reqBody)
    });
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      if (res.acknowledged) {
        body = {
          method: 1,
          indexName
        };

        this.service.httpPut(`searchet?mit=${mit}`, body)
            .pipe(takeUntil(this.destroy$)).subscribe(resl => {
          if (resl[indexName]) {
            console.log(resl);
            for (let i = 0; i < files.length; i++) {
              const file = Object.assign({}, files[i]);
              this.addFileToFolder(file, resl[indexName].settings.index.uuid);
            }
          }
          this.service.getBlockSubject().next(false);
        }, () => {
          this.showErrorMsg(mit, 'Store file failed');
        })
      }
    }, () => {
      this.showErrorMsg(mit, 'Create index failed');
    });
  }

  private createUserIndex() {
    const reqBody = this.filexService.createUserIndexBody();
    const body = {
      method: 4,
      indexName: 'users',
      body: JSON.stringify(reqBody)
    };
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        console.log(res);
        if (res.acknowledged) {
        }
      }, error: () => {
        this.showErrorMsg(mit, 'Create index users failed');
      }
    });
  }

  private search(text: string) {
    if (!this.seldFolder) {
      this.router.navigate(['home'])
          .then(() => {
            setTimeout(() => {
              this.service.getAnySubject().next({
                cmd: 'search',
                txt: text,
                folderIdxPath: this.folderIdxPath
              });
            });
          });
      return;
    }

    let indexName = this.seldFolder._id.toLowerCase();
    if (indexName.startsWith('_')) {
      indexName = 'x' + indexName;
    }
    const body = {
      method: 1,
      indexName
    };
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(resl => {
      if (resl[indexName]) {
        this.router.navigate(['home'])
            .then(() => {
              setTimeout(() => {
                this.service.getAnySubject().next({
                  cmd: 'search',
                  txt: text,
                  indexPath: resl[indexName].settings.index.uuid,
                  folderIdxPath: this.folderIdxPath,
                  indexName
                });
              });
            });
      }
      this.service.getBlockSubject().next(false);
    }, () => {
      this.showErrorMsg(mit, 'Search failed');
    })
  }

  private getAllFiles() {
    let indexName = this.seldFolder._id.toLowerCase();
    if (indexName.startsWith('_')) {
      indexName = 'x' + indexName;
    }

    const reqBody = {
      size: 200,
      query: {
        // term: {
        //   // _id: 'eL0QHIcBBelXRrclj719'
        //   _id: 'd73bG4cBBelXRrclE71Z'
        //   // _id: 'eb2YJ4cBBelXRrclir17'
        // }
        match_all: {}
      }
      /*
            from: 0 * 10,    // n hits to skip
            size: 10,    // max hits to ret
            query: {
              // match: {
              //   content: 'Allah'
              // }
              // eslint-disable-next-line @typescript-eslint/naming-convention
              multi_match: {
                query: 'ceramah',
                //fields = new string[] { "fa_content*" }
                fields: ['*']
              },
            }
      */
    };
    this.selectedFile = null;
    this.seldFile = 'Drop your file here';

    const body = {
      method: 2,
      indexName,
      path: '_search',
      body: JSON.stringify(reqBody)
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      console.log(res);
      this.files = <any>[];
      res.hits.hits.forEach((elmt: any) => {
        if (elmt._source.name.endsWith('.pdf')) {
          this.files.push({
            name: elmt._source.name, class: 'pi pi-file-pdf p-mr-2 mb-2',
            style: {cursor: 'pointer'}, fa_path1: elmt._source.fa_path1,
            _id: elmt._id, _index: elmt._index
          });
        } else {
          this.files.push({
            name: elmt._source.name, class: 'pi pi-file p-mr-2 mb-2',
            style: {cursor: 'pointer'}, fa_path1: elmt._source.fa_path1,
            _id: elmt._id, _index: elmt._index
          });
        }
      });
      this.filesPanelBlocked = false;
    }, () => {
      this.filesPanelBlocked = false;
      this.showErrorMsg(mit, 'Request failed');
    })
  }

  private getAllUsers() {
    let indexName = 'users';

    const reqBody = {
      query: {
        match_all: {}
      }
    };

    const body = {
      method: 2,
      indexName,
      path: '_search',
      body: JSON.stringify(reqBody)
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
      }, error: err => {
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'error', summary: 'error', detail: err
        });
      }, complete: () => {
      }
    });
  }

  private checkBeforeDeleteFolder() {
    if (!this.seldFolder/*.parent -> required to add folder same level */) {
      return;
    }

    if (!this.folderAccessRights.deleteFolder) {
      this.service.getMesgSubject().next({
        severity: 'error', summary: 'Delete failed',
        detail: 'You don\'t have permission'
      });
      return;
    }

    if (this.seldFolder._id === '1') {
      this.service.getMesgSubject().next({
        severity: 'error', summary: 'Delete failed',
        detail: 'Documents is root folder'
      });
      return;
    }

    if (this.files.length > 0 || this.seldFolder.children.length > 0) {
      this.service.getMesgSubject().next({
        severity: 'error', summary: 'Delete failed',
        detail: 'Folder is not empty'
      });
      return;
    }

    this.deleteFolder();
  }

  private deleteFolder() {
    this.service.getBlockSubject().next(true);
    const reqBody = {
      query: {
        term: {
          // _id: 'eL0QHIcBBelXRrclj719'
          name: this.seldFolder.data.name
          // _id: 'eb2YJ4cBBelXRrclir17'
        }
      }
    }
    let body = {
      method: 2,
      indexName: 'docsfolders'
    };
    body = Object.assign(body, {
      path: '_delete_by_query',
      body: JSON.stringify(reqBody)
    });
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(reslt => {
      console.log(reslt);
      let indexName = this.seldFolder._id.toLowerCase();
      if (indexName.startsWith('_')) {
        indexName = 'x' + indexName;
      }

      body = {method: 1, indexName};

      this.service.httpPut(`searchet?mit=${mit}`, body)
          .pipe(takeUntil(this.destroy$)).subscribe(res => {
        if (res[indexName]) {
          body = {method: 3, indexName};
          this.service.httpPut(`searchet?mit=${mit}`, body)
              .pipe(takeUntil(this.destroy$)).subscribe(resl => {
            console.log(resl);

            this.service.getMesgSubject().next({
              severity: 'success', summary: 'Delete success',
              detail: 'Folder telah dihapus'
            });
          }, error => {
            this.showErrorMsg(mit, 'Folders cannot be deleted');
            console.log(error);
          })
        }
        this.service.getBlockSubject().next(false);
      }, () => {
        this.showErrorMsg(mit, 'Folders delete failed', () => {
          const delFolder = this.seldFolder;
          this.seldFolder = this.seldFolder.parent;
          const newChildren = this.seldFolder.children
              .filter((a: any) => a !== delFolder);
          this.seldFolder.children = [...newChildren];
        });
      })
      this.service.getBlockSubject().next(false);
    }, () => {
      this.showErrorMsg(mit, 'Folders delete failed');
    });
  }

  private addUser() {
    const {waktuStr, mit} = CommonService.getCurrentTimeStr();
    const reqBody = {
      // _folder_id: 'fb2HK4cBBelXRrclnL21',
      createTime: waktuStr,
      name: 'jacko',
      passwd: 'My$ecr3T',
      join_field: {
        name: 'user'
      }
    };
    const body = {
      method: 2,
      indexName: 'users',
      path: '_doc',
      body: JSON.stringify(reqBody)
    };

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        console.log(res);
      }, error: () => {
        this.showErrorMsg(mit, 'Add user failed');
      }
    });
  }

  private addUserRightsOnFolder(userId: string, folderId: string, permissions: number) {
    const {waktuStr, mit} = CommonService.getCurrentTimeStr();
    /*
    1 = view folder content
    2 = add folder
    4 = rename folder
    8 = delete folder
    16 = add file
    32 = delete file
    */
    // let rights = 0;
    // rights = 8 + 1;
    const reqBody = {
      createTime: waktuStr,
      _folder_id: folderId,
      access: permissions,
      join_field: {
        name: 'folder',
        // parent: 'GobCFIkBR-qd3QOvS2xw'
        parent: userId
        // parent: {
        //   _id: 'GobCFIkBR-qd3QOvS2xw'
        // }
      }
    };
    const body = {
      method: 2,
      indexName: 'users',
      path: '_doc?routing=1',
      body: JSON.stringify(reqBody)
    };

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        console.log(res);
      }, error: () => {
        this.showErrorMsg(mit, 'Add user failed');
      }
    });
  }

  private getUserAccessRights() {
    const {mit} = CommonService.getCurrentTimeStr();
    /*
    1 = view folder content
    2 = add folder
    4 = rename folder
    8 = delete folder
    16 = add file
    32 = delete file
    */
    const reqBody = {
      query: {
        /*  slow performance
                has_parent: {
                  parent_type: 'user',
                  query: {
                    // match: {
                    //   _id: 'GobCFIkBR-qd3QOvS2xw'
                    // }
                    bool: {
                      filter: [
                        {term: {_id: 'GobCFIkBR-qd3QOvS2xw'}}
                        // {term: {'join_field.parent': 'GobCFIkBR-qd3QOvS2xw'}}
                      ]
                    }
                  }
                }
        */
        /*  slow performance
                has_child: {
                  type: 'folder',
                  query: {
                    match_all: {}

                    // term: {
                    //   join_field: {
                    //     parent: 'GobCFIkBR-qd3QOvS2xw'
                    //   }
                    // }

                    // bool: {
                    //   must: [
                    //     {match: {'join_field.name': 'folder'}},
                    //     {match: {'join_field.parent': 'GobCFIkBR-qd3QOvS2xw'}},
                    //     // { range: { "obj1.count": { "gt": 5 } } }
                    //   ]
                    // }

                  }
                }
        */
        parent_id: {
          type: 'folder',
          // id: 'GobCFIkBR-qd3QOvS2xw'  // user id
          id: this.userId
        }
      }
    };
    const body = {
      method: 2,
      indexName: 'users',
      path: '_search',
      body: JSON.stringify(reqBody)
    };

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        if (!res?.hits?.hits) {
          return;
        }

        let i: number;
        for (i = 0; i < res?.hits?.hits?.length; i++) {
          console.log(`hits ${i} = ${res.hits.hits[i]._source.access}`);
          this.userRights[res.hits.hits[0]._source._folder_id] = res.hits.hits[0]._source.access;
        }
        console.log(this.userRights);
      }, error: error => {
        console.log(error);
        this.showErrorMsg(mit, 'Get user rights failed');
      }
    });
  }

  private getUserAccessPermissions(userId?: string) {
    const reqBody = {
      query: {
        has_parent: {
          parent_type: 'user',
          query: {
            bool: {
              filter: {
                term: {
                  _id: userId
                }
              }
            }
          }
        }
        // { range: { "obj1.count": { "gt": 5 } } }
      }
    };

    const body = {
      method: 2,
      indexName: 'users',
      path: '_search',
      body: JSON.stringify(reqBody)
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        res?.hits?.hits?.forEach((elmt: any) => {
          this.userRights[elmt._source._folder_id] = elmt._source.access;
        });
      }, error: err => {
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'error', summary: 'error', detail: err
        });
      }, complete: () => {
        console.log(this.userRights);
      }
    });
  }  

  private deleteUser() {
    this.service.getBlockSubject().next(true);
    const reqBody = {
      query: {
        term: {
          _id: 'UGyAo4sBPwsv11pUkwjf'
        }
      }
    }
    const body = {
      method: 2,
      indexName: 'users',
      path: '_delete_by_query',
      body: JSON.stringify(reqBody)
    };
    const {mit} = CommonService.getCurrentTimeStr();

    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(reslt => {
      console.log(reslt);
      this.service.getBlockSubject().next(false);
    }, () => {
      this.showErrorMsg(mit, 'Folders delete failed');
    });
  }

  private test() {
    // this.createUserIndex();
    // this.addUserRightsOnFolder(this.userId, this.seldFolder._id);
    // this.addUser();
    this.deleteUser();
    // this.getUserAccessRights();
    // this.testSearchAllIndex();
  }

  private testSearchAllIndex() {
    this.filesPanelBlocked = true;
    const reqBody = {
      query: {
        // term: {
        //   // _id: 'eL0QHIcBBelXRrclj719'
        //   _id: 'd73bG4cBBelXRrclE71Z'
        //   // _id: 'eb2YJ4cBBelXRrclir17'
        // }
        match_all: {}
      }
      /*
            from: 0 * 10,    // n hits to skip
            size: 10,    // max hits to ret
            query: {
              // match: {
              //   content: 'Allah'
              // }
              // eslint-disable-next-line @typescript-eslint/naming-convention
              multi_match: {
                query: 'ceramah',
                //fields = new string[] { "fa_content*" }
                fields: ['*']
              },
            }
      */
    };

    const body = {
      method: 2,
      path: '_search',
      body: JSON.stringify(reqBody)
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      console.log(res);
      this.filesPanelBlocked = false;
    }, () => {
      this.filesPanelBlocked = false;
      this.showErrorMsg(mit, 'Request failed');
    })
  }

  private testSearchByName(fileName: string = 'elasticsearch.png') {
    this.filesPanelBlocked = true;
    const reqBody = {
      query: {
        term: {
          name: fileName
        }
      }
    };

    const body = {
      method: 2,
      path: 'gnjgb4cbqspkrrk7z7m-/_search',
      body: JSON.stringify(reqBody)
    };

    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        console.log(res);
        this.filesPanelBlocked = false;
      },
      error: () => {
        this.filesPanelBlocked = false;
        this.showErrorMsg(mit, 'Request failed');
      }
    });
  }

  private test1() {
    if (!this.seldFolder) {
      return;
    }
    if (this.seldFolder?.data?.name) {
      console.log('do action');
    }

    /*  error thrown if this.seldFolder = null
        if (!this.seldFolder.data.name) {
          console.log('do not action');
          return;
        }
    */

    if (!this.seldFolder?.data?.name) {
      console.log('do not action');
      // return;
    }

    const body = {
      /*
            query: {    // _delete_by_query
              term: {
                // _id: 'eL0QHIcBBelXRrclj719'
                // name: this.seldFolder.data.name
                _id: 'b7hPiYMBRQ_zQD5X099Q'
              }
      */
      /*
              multi_match: {
                query: 'negara',
                //fields = new string[] { "fa_content*" }
                fields: ['*']
              }
      */
      // }
      fields: ['fa_content*']
    }
    console.log(body);
    let indexName = this.seldFolder._id.toLowerCase();
    if (indexName.startsWith('_')) {
      indexName = 'x' + indexName;
    }

    // this.service.httpPost(`_search`, body)
    // this.service.httpPost(`personalia-surat_lamaran/_delete_by_query`, body)
    this.service.httpGet(`${indexName}/_termvectors/${this.seldFolder._id}?fields=fa_content1`,
        false, undefined, environment.urlAdil/*, body*/)
        .pipe(takeUntil(this.destroy$)).subscribe(res => {
      console.log(res);
    }, error => {
      console.log(error);
    });
  }

  private openFile() {    // TODO: Pdf not shown, if it is Not Pdf?
    if (!this.selectedFile) {
      this.service.getMesgSubject().next({
        severity: 'warn', summary: 'Buka File Gagal',
        detail: 'Tidak ada file yang dipilih'
      });
      return;
    }

    if (!this.selectedFile?.fa_path1) {
      this.service.getMesgSubject().next({
        severity: 'info', summary: 'Bukan Lampiran',
        detail: 'Teks bukan di lampiran tetapi terdapat di dalam salah satu field'
      });
      return;
    }

    if (this.selectedFile?.fa_path1.endsWith('file not available')) {
      this.service.getMesgSubject().next({
        severity: 'warn', summary: 'Download Error',
        detail: 'File tidak tersedia'
      });
      return;
    }

    this.service.getBlockSubject().next(true);
    this.service.downloadFile(this.selectedFile.fa_path1).subscribe(
        res => {
          this.service.extractData(res, this.selectedFile.name);
          this.service.getBlockSubject().next(false);
        }, // success path
        error => {
          // console.log(error);
          this.service.getBlockSubject().next(false);
          this.service.getMesgSubject().next({
            severity: 'error',
            summary: 'Search failed',
            detail: error
          });
        } // error path
    );
  }

  private deleteFile() {
    this.service.getBlockSubject().next(true);
    const par = {
      _id: this.selectedFile._id,
      _index: this.selectedFile._index,
      fa_paths: [this.selectedFile.fa_path1]
    }
    this.service.httpPut(`filup`, par)
        .pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
          console.log(data);
          const deldFile = this.seldFile;
          this.service.getBlockSubject().next(false);
          this.service.getMesgSubject().next({
            severity: 'success', summary: 'Hapus File Sukses',
            detail: `File ${deldFile} telah dihapus`
          });

          setTimeout(() => {
            this.getAllFiles();
          });
        }, // success path
        (error) => {
          this.service.getBlockSubject().next(false);
          this.service.getMesgSubject().next({
            severity: 'error', summary: 'Hapus File Gagal',
            detail: error
          });
        })
  }

  private upload() {
    if (!this.seldFolder || this.seldFolder._id === '1') {
      this.service.getMesgSubject().next({
        severity: 'warn', summary: 'Upload failed',
        detail: 'Sub folder must be selected first'
      });
      return;
    }

    if (!this.folderAccessRights.addFile) {
      this.service.getMesgSubject().next({
        severity: 'warn', summary: 'Upload failed',
        detail: 'Tidak ada izin untuk menambah file ke folder ini'
      });
      return;
    }

    if (this.inputFile) {
      this.inputFile.value = '';
    }
    this.description = undefined;
    this.dlgUploadVisible = true;
  }

  public onDrop(event: DragEvent) {
    event.preventDefault();
    let files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Handle the files
      console.log(`Dropped ${files.length} files`);
      setTimeout(() => {
        this.uploadFile({files: files});
      })

    }
  }

  public onDragOver(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
  }
}
