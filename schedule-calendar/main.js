// カレンダー名
const defaultCalendar = 'ScheduleCalendar';

// 現在ログインしているユーザID
let currentUID;

// Firebaseから取得したユーザーの予定を一時保存しておくための変数
let dbdata = {};

 
/**
 * ------------------------------
 *ログイン・ログアウト関連の関数
 * -----------------------------
 */
 
// ログインフォームを初期状態に戻す
const resetLoginForm = () => {
  $('#login-form > .form-group').removeClass('has-error');
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};

// ユーザ作成のときパスワードが弱すぎる場合に呼ばれる
// const onWeakPassword = () => {
//   resetLoginForm();
//   $('#log');
// };

//ログイン時にパスワードが違うときに呼び出される
const onWrongPassword= () => {
  resetLoginForm();
  $('#login__password').addClass('has-error');
  $('#login__help')
    .text('パスワードが違います')
    .fadeIn();
};

// ログインのとき試行回数が多すぎてブロックされている場合に呼ばれる
const onTooManyRequests = () => {
  resetLoginForm();
  $('#login__submit-button').prop('disabled', true);
  $('#login__help')
    .text('試行回数が多すぎます。後ほどお試しください。')
    .fadeIn();
};

// ログインのときメールアドレスの形式が正しくない場合に呼ばれる
const onInvalidEmail = () => {
  resetLoginForm();
  $('#login__email').addClass('has-error');
  $('#login__help')
    .text('メールアドレスを正しく入力してください')
    .fadeIn();
};

// その他のログインエラーの場合に呼ばれる
const onOtherLoginError = () => {
  resetLoginForm();
  $('#login__help')
    .text('ログインに失敗しました')
    .fadeIn();
};

// ユーザ作成に失敗したことをユーザに通知する
const catchErrorOnCreateUser = (error) => {
  // 作成失敗
  console.error('ユーザ作成に失敗:', error);
  if (error.code === 'auth/weak-password') {
    // onWeakPassword();
  } else {
    // その他のエラー
    onOtherLoginError(error);
  }
};

// ログインに失敗したことをユーザーに通知する
const catchErrorOnSignIn = (error) => {
  if (error.code === 'auth/wrong-password') {
    // パスワードの間違い
    onWrongPassword();
  } else if (error.code === 'auth/too-many-requests') {
    // 試行回数多すぎてブロック中
    onTooManyRequests();
  } else if (error.code === 'auth/invalid-email') {
    // メールアドレスの形式がおかしい
    onInvalidEmail();
  } else {
    // その他のエラー
    onOtherLoginError(error);
  }
};

// ログイン・ログアウト時で表示を変更
const changeView = () => {
  $("#loading").hide();
  if(currentUID != null) {
    // ログイン状態のとき
    $('.visible-on-login')
      .removeClass('hidden-block')
      .addClass('visible-block');
    
    $('.visible-on-logout')
      .removeClass('visible-block')
      .addClass('hidden-block');
  } else {
    // ログアウト状態の時
    $('.visible-on-login')
      .removeClass('visible-block')
      .addClass('hidden-block');
      
    $('.visible-on-logout')
      .removeClass('hidden-block')
      .addClass('visible-block');
  }
};

/**
 * ------------------------
 *ログイン・ログアウト関連
 * ------------------------
 */
 
// ログインフォームが送信されたらログインする
$('#login-form').on('submit', (e) => {
  e.preventDefault();

  // フォームを初期状態に戻す
  resetLoginForm();

  // ログインボタンを押せないようにする
  $('#login__submit-button')
    .prop('disabled', true)
    .text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();

  // ログインを試みて該当ユーザが存在しない場合は新規作成する
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((user) => {
      console.log('ログインしました', user);
    })
    .catch((error) => {
      console.log('ログイン失敗:', error);
      if (error.code === 'auth/user-not-found') {
        // 該当ユーザが存在しない場合は新規作成する
        firebase
          .auth()
          .createUserWithEmailAndPassword(email, password)
          .then(() => {
            // 作成成功
            console.log('ユーザを作成しました');
          })
          .catch(catchErrorOnCreateUser);
      } else {
        catchErrorOnSignIn(error);
      }
    });
});

// ログアウトをクリックしたらログアウトする
$('#logout-button').on('click', () => {
  firebase
    .auth()
    .signOut() // ログアウト実行
    .then(() => {
      resetLoginForm();
      console.log('ログアウトしました');
    })
    .catch((error) => {
      console.error('ログアウトに失敗しました', error);
    });
});

/**
 *---------------
 *Vueインスタンス
 *---------------
 */
 
new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  data: () => ({
    arrayEvents: [],
    date: new Date().toISOString().substr(0, 10),
    dailySchedule: '',
  }),
  created() {
    // child_addedイベントハンドラ関数
    const child_added_event = () => {
      const scheduleRef = firebase.database().ref(`${defaultCalendar}/${currentUID}`);
      scheduleRef.on("child_added", (snapshot) => {
        // 日付と予定を取得
        const day = snapshot.key;
        const schedule = snapshot.val();
        // 一次キャッシュ変数のデータを追加
        dbdata.currentUID = (day, schedule);

        // 予定のある日付にポイント追加
        this.arrayEvents.push(day);
      });
    };
    // child_removedイベントハンドラ関数
    const child_removeded_event = () => {
      const scheduleRef = firebase.database().ref(`${defaultCalendar}/${currentUID}`);
      scheduleRef.on("child_removed", (snapshot) => {
        const day = snapshot.key;
        // 一次キャッシュ変数のデータを削除
        console.log(`${day}を削除しました`);
        
        // 予定を消した日からポイントを削除
        const array = this.arrayEvents;
        const result = array.indexOf(day);
        array.splice(result, 1);
      });
    };
    
    const removeChildAddedEvent = () => {
      const scheduleRef = firebase.database().ref(`${defaultCalendar}/${currentUID}`);
      scheduleRef.off("child_added");
    };
    
    const removeChildRemovedEvent = () => {
      const scheduleRef = firebase.database().ref(`${defaultCalendar}/${currentUID}`);
      scheduleRef.off("child_removed");
    };

    // // ユーザのログイン状態が変化したら呼び出される、コールバック関数を登録
    firebase
      .auth()
      .onAuthStateChanged((user) => {
        if(user) {
          // ログインしているときの処理
          currentUID = user.uid;
          console.log('状態: ログイン中');
          changeView();
          // child_addedイベンドハンドラ 関数
          child_added_event();
          // child_removedイベントハンドラ 関数
          child_removeded_event();
        } else {
          // ログインしていないときの処理
          currentUID = null;
          console.log('状態: ログアウト');
          changeView();
          resetLoginForm();
          // カレンダーの表示をリセット
          this.arrayEvents = [];
          this.date = new Date().toISOString().substr(0, 10);
          // child_addedイベントハンドラ削除
          removeChildAddedEvent();
          // child_removedイベントハンドラ削除
          removeChildRemovedEvent();
        }
      });
  },
  methods: {
    // カレンダーの日付を押したときの処理
    clickDay(date) {
      // 日付のデータを取得
      const day = this.date;
      firebase
        .database()
        .ref(`${defaultCalendar}/${currentUID}/${day}`)
        .on('value', (snapshot) =>  {
          const schedule = snapshot.val();
          //予定が入っている場合はdailyScheduleに予定を格納
          if (schedule != null) {
            this.dailySchedule = schedule;
          } else {
            this.dailySchedule = '予定が入ります';
          }
        });
    },
    // 予定のボタンを押したときの処理
    inputSchedule(schedule) {
      const day = this.date; 
      // firebaseに日付と予定を追加
      firebase
        .database()
        .ref(`${defaultCalendar}/${currentUID}/${day}`)
        .set(schedule);
    },
    // 削除ボタンを押したときの処理
    deleteSchedule() {
      const day = this.date;
      // firebaseから予定を削除
      firebase
        .database()
        .ref(`${defaultCalendar}/${currentUID}/${day}`)
        .remove();
    },
  },
});

