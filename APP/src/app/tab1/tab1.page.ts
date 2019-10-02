import { Component, ViewChild, ElementRef } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { IterableChangeRecord_ } from '@angular/core/src/change_detection/differs/default_iterable_differ';
import { SQLitePorter } from '@ionic-native/sqlite-porter/ngx';
import { getLocaleDateTimeFormat } from '@angular/common';
import { AlertController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Storage } from '@ionic/storage';
import { HttpClient } from '@angular/common/http';
import { icon, Marker, Map, latLng, tileLayer, Layer, marker } from 'leaflet';
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  inputs: [],
  outputs: []
})
export class Tab1Page {

  //---------------------------------------------------
  // 成員  
  //---------------------------------------------------
  @ViewChild('mapContainer') mapContainer: ElementRef;
  map: any;
  userId: any;
  lat= [];
  long= [];
  time= [];
  record= [];
  sportRecord= [];
  orbitRecordNo: any;
  
  isStartEnabled: boolean = true;
  isStopEnabled: boolean = false;

  center:any={
    'lat':25.042375,
    'lng':121.525383,
    'name':'北商大'
  };  
  get_duration_interval: any;
  
  sports = [
    {
      id: 4,
      type: '健走'
    },
    {
      id: 5,
      type: '跑步'
    },
    {
      id: 6,
      type: '單車'
    }
  ];
  
  //--------------------------------------------------- 
  // 建構元
  //---------------------------------------------------  
  constructor(private geolocation: Geolocation, public alertController: AlertController, 
    private router: Router, private route: ActivatedRoute, private storage: Storage, public http: HttpClient) {
  }

  ngOnInit() {
    this.storage.get('userId').then((val) => {
      console.log('Your userId is', val);
      this.userId = val;
      console.log(this.userId);
    });
  }
  
  
  //////////////////////////登出
  async logout() {
    const alert = await this.alertController.create({
      header: '登出',
      message: '確定要登出嗎？',
      buttons: [
        {
          text: 'Cancel'
        }, {
          text: 'Okay',
          handler: () => {
            console.log('Confirm Okay');
            this.router.navigate([''])
          }
        }
      ]
    });

    await alert.present();
  }

  //////////////////////////disabled
  isCheckStart(){
    return true;
  }

  //////////////////////////計時器
  selectSportType: any = 4;
  ngSportType(event){
    this.selectSportType = event['id'];
  }
  startInterval(){
    //按下去的當下即新增一筆紀錄
    this.locate();
    this.addOrbitRecord();
    this.isStartEnabled = false;
    this.isStopEnabled = true;
    console.log("****" + this.selectSportType);

    //判斷sportType, 以設定計時器
    if(this.selectSportType==null){
      this.showNotChose();
    }else if(this.selectSportType===4){
      console.log('走');
      this.get_duration_interval= setInterval(()=> { this.locate() }, 1000*8);
    }else if(this.selectSportType===5){
      console.log('跑');
      this.get_duration_interval= setInterval(()=> { this.locate() }, 1000*5);
    }else if(this.selectSportType===6){
      console.log('騎');
      this.get_duration_interval= setInterval(()=> { this.locate() }, 1000*2);
    }
  }
  
  endInterval(){
    clearInterval(this.get_duration_interval);
    this.sportRecord.push(this.selectSportType, this.userId, this.record);
    console.log(this.sportRecord);
    console.log('start time: ' + this.record[0]);
    console.log('end time: ' + this.record[this.record.length-1]);
    
    this.orbitTransfer();
    this.updateOrbitRecord();
    //清空record, sportRecord
    this.record=[];
    this.sportRecord=[];
  }

  locate():any{
    this.geolocation.getCurrentPosition().then((resp) => {
      this.record.push([Date(), resp.coords.latitude, resp.coords.longitude]);
      console.log(this.record);
    }).catch((error) => {
      console.log('Error getting location', error);
    });
  }

  //////////////////////////新增orbit_record
  addOrbitRecord(){
    console.log("addOrbitRecord: " + this.userId, this.selectSportType, Date());
    // 傳給主機的參數
    
    this.http.post("http://140.131.115.88:80/mobile_orbitrecord_add", {"userId":  this.userId, "sportType": this.selectSportType, "sportStartTime": Date()})
    .subscribe(data  => {
      console.log("Add Orbit Record successful :", data);
      if(data == "0"){
        this.queryOrbitRecordNo(); //找orbitRecordNo
      }else{
        this.showNotConfirm();
        this.isStartEnabled = true;
        this.isStopEnabled = false;
      }
    },
    error  => {
      console.log("Error", error);
      this.isStartEnabled = true;
      this.isStopEnabled = false;
      }
    );
  }

  //////////////////////////查詢orbit record number
  queryOrbitRecordNo(){
    console.log("queryOrbitRecord: " + this.userId, this.record[0][0]);

    // 傳給主機的參數
    this.http.post("http://140.131.115.88:80/mobile_returnNo", {"userId":  this.userId, "sportStartTime": this.record[0][0]})
    .subscribe(data  => {
      console.log("Query Orbit Record Number successful :", data[0].orbitrecordno);
      this.orbitRecordNo = data[0].orbitrecordno;
    },
    error  => {
      console.log("Error", error);
      }
    );
  }
  
  //////////////////////////新增orbit
  orbitTransfer(){
    var i;
    console.log(this.orbitRecordNo);
    for(i=0; i<=this.record.length-1; i++){
      console.log("orbit: " + this.orbitRecordNo + " " + this.record[i][0], 
        this.record[i][1], this.record[i][2]);
      
      this.http.post("http://140.131.115.88:80/mobile_orbit_add", 
        {"orbitRecordNo":  this.orbitRecordNo, "orbitDatetime": this.record[i][0], "lat": this.record[i][1], "lng": this.record[i][2]})
      .subscribe(data  => {
        console.log("Add orbit successful :", data);
      },
      error  => {
        console.log("Error", error);
        }
      );
    }
  }

  updateOrbitRecord(){
    console.log("updateOrbitRecord: " + this.orbitRecordNo, this.record[this.record.length-1][0]);
    // 傳給主機的參數
    
    this.http.post("http://140.131.115.88:80/mobile_update", {"orbitRecordNo":  this.orbitRecordNo, "sportEndTime": this.record[this.record.length-1][0]})
    .subscribe(data  => {
      console.log("Update Orbit Record successful :", data);
      if(data == 0){
        this.showConfirm();
        this.isStartEnabled = false;
        this.isStopEnabled = true;
      }else{
        this.showNotChose();
        this.isStartEnabled = false;
      }
    },
    error  => {
      console.log("Error", error);
      this.isStartEnabled = false;
      }
    );
    
  }


  //----------------------------------
  // 顯示成功訊息
  //----------------------------------
  async showConfirm(){
    let alert = await this.alertController.create({
      header: '新增成功!',
      subHeader: '快去紀錄區查看你的運動紀錄吧!',
      buttons: ['OK']
    });
    await alert.present();
  }

  //----------------------------------
  // 顯示讀取失敗訊息
  //----------------------------------
  async showAlert(){
    const  alert = await this.alertController.create({
      header: '資料取得失敗!',
      subHeader: '請確定網路狀態, 或是主機是否提供服務中.',
      buttons: ['OK']
    });
    await alert.present();
  }

  //----------------------------------
  // 顯示無符合資料訊息
  //----------------------------------
  async showNotConfirm() {
    const  alert = await this.alertController.create({
      header: '新增失敗!',
      subHeader: '請重新確認帳號密碼',
      buttons: ['OK']
    });
    await alert.present();
  }
  //----------------------------------    

  //----------------------------------
  // 顯示新增失敗訊息
  //----------------------------------
  async showNotChose() {
    const  alert = await this.alertController.create({
      header: '新增失敗!',
      subHeader: '請選擇運動項目',
      buttons: ['OK']
    });
    await alert.present();
  }
  //----------------------------------    

  
  //////////////////////////MAP
  ionViewDidEnter() {
    this.leafletMap();
  }

  leafletMap() {
    this.map = new Map('mapId').setView([25.0461158, 121.5255704], 17);
    
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {
      foo: 'bar'
    }).addTo(this.map);

    const markPoint = marker([25.0461158, 121.5255704]);
    markPoint.bindPopup('<p>I am here!</p>');
    this.map.addLayer(markPoint);
  }

  ionViewWillLeave() {
    this.map.remove();
  }

  /*
  //----------------------------------
  // 畫面完成後執行
  //----------------------------------
  ionViewWillEnter() {
    this.displayGoogleMap();
    this.addMarkersToMap();
  }


  //----------------------------------
  displayGoogleMap() {
    let latLng = new google.maps.LatLng(this.center.lat, this.center.lng);

    let mapOptions = {
      center: latLng,
      disableDefaultUI: true,
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }

    this.map = new google.maps.Map(this.mapContainer.nativeElement, mapOptions);
  }


  //---------------------------------- 
  // 顯示Google地圖
  //---------------------------------- 
  addMarkersToMap() {
    var position = new google.maps.LatLng(this.center.lat, this.center.lng);
    var myMarker = new google.maps.Marker({position:position, title:this.center.name});
    
    myMarker.setMap(this.map);    
  }
  */
  
}