import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {TreeNode} from 'primeng/api';
import {CommonService} from 'src/app/services/common.service';
import {FileIndexService} from 'src/app/services/file-index.service';

@Component({
  selector: 'app-user-access-right',
  templateUrl: './user-access-right.component.html',
  styleUrls: ['./user-access-right.component.scss']
})
export class UserAccessRightComponent implements OnInit, OnDestroy {
  folderTree: TreeNode[] = [];
  selectedFolder: TreeNode[] = [];
  cols: any[] = [];
  folders: any[] = [];
  users: any;
  selectedUser: any | null;
  prevUser: any;
  // accessPermissions: any[] = [];
  folderIdTo_foldersIdxMap: any[] = [];
  userEditing = false;
  // @ViewChild('yourInput', {static: false}) yourInput: ElementRef<HTMLInputElement> = {} as ElementRef;
  // @ViewChild('dv1', {static: false}) div1?: ElementRef = undefined;
  personAddIcon = 'material-icons mi-person-add';
  personEditIcon = 'material-icons mi-edit';
  userName: string = '';
  pswdInpType = 'password';
  eyeSpanClz = 'pi pi-eye p-2';
  // usersRowSty = 'background-color: white';
  private anySubjSubsc?: Subscription;
  private destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(private filexService: FileIndexService, private service: CommonService) {
  }

  ngOnInit() {
    this.anySubjSubsc = this.service.getAnySubject()
        .pipe(takeUntil(this.destroy$)).subscribe(value => {
          if (value.cmd === 'test') {
            this.folderTree = [];
          } else if (value.folderIdxId) {
            console.log(value.folderIdxId);
          }
        });
    // this.nodeService.getFiles().then(files => this.files1 = files);
    // this.nodeService.getFilesystem().then(files => this.folderTree = files);
    // this.nodeService.getFiles().then(files => {
    //     this.files3 = [{
    //         label: 'Root',
    //         children: files
    //     }];
    // });
    /*
        this.service.getFile('assets/demo/data/filesystem.json')
          .pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
              this.folderTree = res.data as TreeNode[];

              console.log(res);
            }, error: err => {
            }, complete: () => {
              console.log('complete');
              this.cols = [
                { field: 'name', header: 'Name' },
                { field: 'size', header: 'Size' },
                { field: 'type', header: 'Type' }
              ];
            }
          });
     */
    this.getAllUsers();
    this.createFoldersTree();
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  private testAuth() {
    let indexName = 'users';

    const reqBody = {
      query: {
        bool: {
          must: [
            {term: { join_field: 'user'}},
            {term: {name : 'ganjar'}},
            {term: {passwd : 'pranowoc'}}
          ]
        }
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
        console.log(res);
      }, error: err => {
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'error', summary: 'error', detail: err
        });
      }, complete: () => {
      }
    });
  }

  private getAllUsers() {
    let indexName = 'users';

    const reqBody = {
      query: {
        // match_all: {}

        term: {
          join_field: 'user'
        }
        // { range: { "obj1.count": { "gt": 5 } } }
      },
      sort: [
        {createTime: {format: 'strict_date_optional_time_nanos'}}
      ]
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
        console.log(res);
        this.users = [];
        let i = 0;
        res?.hits?.hits?.forEach((elmt: any) => {
          const row = {
            noIndex: ++i,
            name: elmt._source.name,
            passwd: elmt._source.passwd,
            createTime: elmt._source.createTime,
            _id: elmt._id,
            editing: false
          };
          this.users.push(row);
        });
      }, error: err => {
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'error', summary: 'error', detail: err
        });
      }, complete: () => {
      }
    });
  }

  private createFoldersTree(userId?: string) {
    console.log('createFoldersTree');
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
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        // console.log(data.hits);
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
            _id: '1', parentId: null, label: 'Documents', data: {
              name: 'Documents',
              addFolder: false,
              renFolder: false,
              delFolder: false,
              addFile: false,
              delFile: false,
              viewFolder: false
            },
            expandedIcon: 'pi pi-folder-open', collapsedIcon: 'pi pi-folder'
          },
          // {_id: '2', parentId: 1, label: 'Work'},
          // {_id: '3', parentId: 1, label: 'Home'},
          // {_id: '4', parentId: 2, label: 'Expenses.doc'},
          // {_id: '5', parentId: 2, label: 'Resume.doc'},
          // {_id: '6', parentId: 3, label: 'Invoices.txt'},
        ];
        this.folderIdTo_foldersIdxMap = [];
        let i = 1;    // TODO: Test this with home version
        data.hits.hits.forEach((elmt: any) => {
          const node = {
            _id: elmt._id,
            parentId: elmt._source._parent_id.toString(),
            label: elmt._source.label,
            data: elmt._source,
            expandedIcon: 'pi pi-folder-open',
            collapsedIcon: 'pi pi-folder'
          };
          node.data.name = node.label;
          node.data.addFolder = false;
          node.data.renFolder = false;
          node.data.delFolder = false;
          node.data.addFile = false;
          node.data.delFile = false;
          node.data.viewFolder = false;

          nodes.push(node);
          this.folderIdTo_foldersIdxMap[elmt._id] = i++;
        });

        this.folders = nodes;

        // @ts-ignore
        this.folderTree = this.filexService.buildTree(nodes);
        this.service.getBlockSubject().next(false);
      }, // success path
      error: () => {
        // this.showErrorMsg(mit, 'Folder tree cannot be created');
      }, complete: () => {
        if (userId) {
          this.getUserAccessPermissions(userId);
          return;
        }

        this.cols = [
          {field: 'name', header: 'Folder', width: '15rem'},
          {field: 'viewFolder', header: 'View Folder', width: '7rem'},
          {field: 'addFolder', header: 'Add Folder', width: '7rem'},
          {field: 'renFolder', header: 'Rename Folder', width: '7rem'},
          {field: 'delFolder', header: 'Delete Folder', width: '7rem'},
          {field: 'addFile', header: 'Add File', width: '7rem'},
          {field: 'delFile', header: 'Delete File', width: '7rem'}
        ];
      }
    }); // error path
  }

  onRowSelectedUsers(event: any, usersTable: any) {
    if (this.userEditing && !event.data.editing) {
      return;
    }
    this.selectedUser = event.data;
    this.getUserAccessPermissions(this.selectedUser._id);
  }

  onRowUnselectedUsers(event: any) {
    if (this.userEditing) {
      return;
    }
    this.selectedUser = null;
    // TODO: clear all access perm rows status
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
        // this.accessPermissions = [];
        this.folders.forEach(folder => {
          folder.data.viewFolder = false;
          folder.data.addFolder = false;
          folder.data.renFolder = false;
          folder.data.delFolder = false;
          folder.data.addFile = false;
          folder.data.delFile = false;
          folder.data.permissionId = null;
        });

        res?.hits?.hits?.forEach((elmt: any) => {
          const row = {
            folderId: elmt._source._folder_id,
            access: elmt._source.access,
            createTime: elmt._source.createTime,
            _id: elmt._id
          };
          // this.accessPermissions.push(row);
          if (!this.folderIdTo_foldersIdxMap[row.folderId]) {
            return;
          }

          const folder = this.folders[this.folderIdTo_foldersIdxMap[row.folderId]];
          folder.data.viewFolder = (elmt._source.access & 1) > 0;
          folder.data.addFolder = (elmt._source.access & 2) > 0;
          folder.data.renFolder = (elmt._source.access & 4) > 0;
          folder.data.delFolder = (elmt._source.access & 8) > 0;
          folder.data.addFile = (elmt._source.access & 16) > 0;
          folder.data.delFile = (elmt._source.access & 32) > 0;
          folder.data.permissionId = elmt._id;
          // this.folderIdTo_foldersIdxMap[row.folderId].access = elmt._source.access;
        });
      }, error: err => {
        this.service.getBlockSubject().next(false);
        this.service.getMesgSubject().next({
          severity: 'error', summary: 'error', detail: err
        });
      }, complete: () => {
      }
    });
  }

  onNodeSelect(event: any) {
    // console.log('>> onNodeSelect');
    // console.log(event.node);    //event.node = selected node
    // console.log(this.folderIdTo_foldersIdxMap[event.node._id]);    //event.node = selected node
    // console.log('onNodeSelect >>');
  }

  save() {
    console.log(">> save");

    let i: number;
    for (i = 0; i < this.folders.length; i++) {
      const folder = this.folders[i];
      if (folder._id === '1') {
        continue;
      }
      // console.log(elmt);
      let ap = 0;
      ap = ap | (folder.data.viewFolder ? 1 : 0);
      ap = ap | (folder.data.addFolder ? 2 : 0);
      ap = ap | (folder.data.renFolder ? 4 : 0);
      ap = ap | (folder.data.delFolder ? 8 : 0);
      ap = ap | (folder.data.addFile ? 16 : 0);
      ap = ap | (folder.data.delFile ? 32 : 0);

      if (folder.data.permissionId) {
        folder.access = ap;
        const par = {
          script: {
            source: `ctx._source.access = ${ap}`,
            lang: 'painless'
          }
        }

        const body = {
          method: 2,
          indexName: 'users',
          path: `_update/${folder.data.permissionId}`,
          body: JSON.stringify(par)
        };
        const {mit} = CommonService.getCurrentTimeStr();
        console.log(`permissionId = ${folder.data.permissionId}`);

        this.service.httpPut(`searchet?mit=${mit}`, body)
            .pipe(takeUntil(this.destroy$)).subscribe({
          next: res => {
            console.log(res);
          }, error: () => {
            console.log(mit, 'Access permissions changes failed');
          }
        });
       
        continue;
      }

      this.addUserRightsOnFolder(this.selectedUser._id, folder._id, ap);

      /*
            if (this.folders[this.folderIdTo_foldersIdxMap[folder._id]]) {
              if (!this.folders[this.folderIdTo_foldersIdxMap[folder._id]]._id) {
                this.addUserRightsOnFolder(this.selectedUser._id, folder._id, ap);
                continue;
              }

              this.folders[this.folderIdTo_foldersIdxMap[folder._id]].access = ap;
              const id = this.folders[this.folderIdTo_foldersIdxMap[folder._id]]._id;
              console.log(id);
              const par = {
                script: {
                  source: `ctx._source.access = ${ap}`,
                  lang: 'painless'
                } ,
                // query: {
                //   bool: {
                //     filter: {
                //       term: {
                //         _id: id
                //       }
                //     }
                //   }
                // }
              }

              const body = {
                method: 2,
                indexName: 'users',
                path: `_update/${id}`,
                body: JSON.stringify(par)
              };
              const { mit } = CommonService.getCurrentTimeStr();
              this.service.httpPut(`searchet?mit=${mit}`, body)
                .pipe(takeUntil(this.destroy$)).subscribe({
                  next: res => {
                    console.log(res);
                  }, error: () => {
                    console.log(mit, 'Folder rename failed');
                  }
                });
            }
      */

    }

    /*
      this.accessPermissions.forEach((elmt: any) => {
          console.log('---');
          console.log(elmt);
        });
     */
    console.log("save >>");
  }

  addUser(usersTable: any) {
    if (this.userEditing) {
      if (!this.selectedUser) {
        return;
      }

      this.personAddIcon = 'material-icons mi-person-add';
      this.personEditIcon = 'material-icons mi-edit';
      this.pswdInpType = 'password';
      this.eyeSpanClz = 'pi pi-eye p-2';
      this.selectedUser.editing = false;
      this.userEditing = false;

      if (this.selectedUser._id === '0') {
        this.saveNewUser(this.selectedUser);
      } else {
        this.saveUser();
      }
      usersTable.editing = false;
    } else {
      this.personAddIcon = 'pi pi-check';
      this.personEditIcon = 'pi pi-undo';
      const row = {
        noIndex: this.users.length + 1,
        name: ' ',
        passwd: ' ',
        createTime: new Date(),
        _id: '0',
        editing: true
      };
      this.users.push(row);
      this.selectedUser = row;
      usersTable.editing = true;
      this.folders.forEach(folder => {
        folder.data.viewFolder = false;
        folder.data.addFolder = false;
        folder.data.renFolder = false;
        folder.data.delFolder = false;
        folder.data.addFile = false;
        folder.data.delFile = false;
      });
      this.userEditing = !this.userEditing;
    }

    usersTable.editingRowKeys[this.selectedUser.noIndex]
        = !usersTable.editingRowKeys[this.selectedUser.noIndex];
  }

  editUser(usersTable: any) {
    if (!this.selectedUser) {
      return;
    }

    if (this.selectedUser.name === 'admin') {
      this.service.getMesgSubject().next({
        severity: 'warn', summary: 'Tidak Bisa Dirubah', 
        detail: 'admin tidak bisa dirubah atau dihapus'
      });
      return;
    }

    usersTable.editingRowKeys[this.selectedUser.noIndex]
        = !usersTable.editingRowKeys[this.selectedUser.noIndex];

    if (this.userEditing) {
      this.personAddIcon = 'material-icons mi-person-add';
      this.personEditIcon = 'material-icons mi-edit';
      this.pswdInpType = 'password';
      this.eyeSpanClz = 'pi pi-eye p-2';
      this.selectedUser.editing = false;
      usersTable.editing = false;
      // this.usersRowSty = 'background-color: white';

      if (this.selectedUser?._id !== '0') {
        this.selectedUser.name = this.prevUser?.name;
        this.selectedUser.passwd = this.prevUser?.passwd;
      } else {
        const newIdx = this.users.findIndex((user: any) => user._id === '0');
        if (newIdx) {
          this.users.splice(newIdx, 1);
        }
        this.selectedUser = null;
      }
      /*
      const foundUser = this.users.find((user: any) => user.noIndex === this.prevUser.noIndex);

      // Check if a user with the specified userId was found
      if (foundUser) {
        foundUser.name = this.prevUser.name;
        foundUser.passwd = this.prevUser.passwd;
        // this.selectedUser = foundUser;
      }
*/
    } else {
      this.personAddIcon = 'pi pi-check';
      this.personEditIcon = 'pi pi-undo';
      this.prevUser = Object.assign({}, this.selectedUser);
      // this.usersRowSty = 'background-color: gold';
      this.selectedUser.editing = true;
      usersTable.editing = true;
    }

    this.userEditing = !this.userEditing;
    // document?.getElementById('id1')?.click();
  }

  saveUser() {
    console.log(">> saveUser");
    const par = {
      script: {
        source: `ctx._source.name = '${this.selectedUser.name.trim()}';`
            + `ctx._source.passwd = '${this.selectedUser.passwd.trim()}'`,
        lang: 'painless'
      }/* ,
          query: {
            bool: {
              filter: {
                term: {
                  _id: id
                }
              }
            }
          } */
    }

    const body = {
      method: 2,
      indexName: 'users',
      path: `_update/${this.selectedUser._id}`,
      body: JSON.stringify(par)
    };
    const {mit} = CommonService.getCurrentTimeStr();
    this.service.httpPut(`searchet?mit=${mit}`, body)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        console.log(res);
      }, error: (err) => {
        console.log(mit, err);
      }
    });
    console.log("saveUser >>");
  }

  userNameChanged(ev: any) {
    this.selectedUser.name = ev.target.value;

    const foundUser = this.users.find((user: any) => user.noIndex === this.selectedUser.noIndex);

    // Check if a user with the specified userId was found
    if (foundUser) {
      console.log('User found:', foundUser);
      foundUser.name = ev.target.value;
    } else {
    }

  }

  eyeClicked() {
    if (this.pswdInpType === 'password') {
      this.pswdInpType = 'text';
      this.eyeSpanClz = 'pi pi-eye-slash p-2';
    } else {
      this.pswdInpType = 'password';
      this.eyeSpanClz = 'pi pi-eye p-2';
    }
  }

  removeUser() {
    if (!this.selectedUser) {
      return;
    }

    if (this.selectedUser.name === 'admin') {
      this.service.getMesgSubject().next({
        severity: 'warn', summary: 'Tidak Bisa Dirubah', 
        detail: 'admin tidak bisa dirubah atau dihapus'
      });
      return;
    }

    this.service.getBlockSubject().next(true);
    const reqBody = {
      query: {
        term: {
          _id: this.selectedUser._id
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
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: reslt => {
        console.log(reslt);
        this.selectedUser = null;
        this.service.getBlockSubject().next(false);
      }, error: () => {
        this.showErrorMsg(mit, 'User delete failed');
      }
    });
  }

  private saveNewUser(row: any) {
    const {waktuStr, mit} = CommonService.getCurrentTimeStr();
    const reqBody = {
      createTime: waktuStr,
      name: row.name,
      passwd: row.passwd,
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
        // this.onRowSelectedUsers({ data: row }, null);    // TODO: test this
        this.selectedUser._id = res._id;
        this.service.getMesgSubject().next({
          severity: 'success', summary: 'User creation success',
          detail: `User ${row.name} has been created`
        });
      }, error: () => {
        this.showErrorMsg(mit, 'Add user failed');
      }
    });
  }

  private showErrorMsg(mit: string, summary: string) {
    this.service.httpGet(`excevlet?mit=${mit}`)
        .pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
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
        console.log('complete');
      }
    });
  }

  private addUserRightsOnFolder(userId: string, folderId: string | any, permissions: number) {
    console.log(">> addUserRightsOnFolder");
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
        // @ts-ignore
        console.log(res);
        this.folders[this.folderIdTo_foldersIdxMap[folderId]].data.permissionId = res._id;
      }, error: () => {
        this.showErrorMsg(mit, 'Add user failed');
      }
    });
    console.log("addUserRightsOnFolder >>");
  }

  private folderTraverseDF(callback: (node: TreeNode) => void, current: TreeNode) {
    callback(current);
    // @ts-ignore
    for (const child of current.children) {
      this.folderTraverseDF(callback, child);
    }
  }


  canSelectUsersRow(event: any): boolean {
    // @ts-ignore
    return !this.editing;   // this = p-table
  }
}
